from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_correlation_id, get_current_user_doc
from app.db.session import get_session
from app.models.client import Client
from app.services.clients import (
    build_client_doc,
    client_model_to_dict,
    client_to_detail,
    client_to_summary,
    dedup_matches_for_payload,
    search_clients,
    validate_create,
)
from app.services.deduplication import pairs_among
from app.services.phi_access import record_phi_access

router = APIRouter(prefix="/clients", tags=["clients"])

CLIENT_DENIED_ROLES = {"cross_program_liaison", "auditor"}
CLIENT_CREATE_DENIED = CLIENT_DENIED_ROLES | {"tenant_admin"}
MERGE_ROLES = {"supervisor", "tenant_admin", "organization_admin"}


class CreateClientRequest(BaseModel):
    name: str
    phone: str
    address: str
    dob: str | None = None
    contactReason: str | None = None
    screeningNotes: str | None = None
    emergencyTrigger: str | None = None
    serviceNeed: bool = False
    confirmDespiteDuplicates: bool = False


class DedupCheckRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    dob: str | None = None
    excludeClientId: str | None = None


class MergeClientsRequest(BaseModel):
    survivorId: str
    duplicateId: str


async def tenant_clients(session: AsyncSession, tenant_id: str) -> list[dict]:
    result = await session.execute(
        select(Client).where(Client.tenant_id == tenant_id, Client.status != "merged")
    )
    return [client_model_to_dict(c) for c in result.scalars().all()]


def _parse_dob(value: str | None):
    if not value:
        return None
    from datetime import date as date_cls

    return date_cls.fromisoformat(value)


@router.get("", operation_id="listClients")
async def list_clients(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
    q: str | None = Query(default=None),
):
    if user.get("role") in CLIENT_DENIED_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})

    clients = await tenant_clients(session, user["tenant_id"])
    if q:
        clients = search_clients(clients, q)
    summaries = [client_to_summary(c) for c in clients]
    await record_phi_access(
        session,
        tenant_id=user["tenant_id"],
        actor_id=user["_id"],
        action="list",
        resource_type="client",
        detail={"count": len(summaries), "hasQuery": bool(q and q.strip())},
        request=request,
        correlation_id=correlation_id,
    )
    await session.commit()
    return {"items": summaries}


@router.post("", operation_id="createClient", status_code=status.HTTP_201_CREATED)
async def create_client(
    body: CreateClientRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") in CLIENT_CREATE_DENIED:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})

    payload = body.model_dump()
    try:
        validate_create(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"error": "validation", "message": str(exc)}) from exc

    clients = await tenant_clients(session, user["tenant_id"])
    matches = dedup_matches_for_payload(payload, clients)
    if matches and not body.confirmDespiteDuplicates:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "duplicate_detected",
                "message": "Possible duplicate client detected",
                "matches": matches,
            },
        )

    doc = build_client_doc(payload, user["tenant_id"], user["_id"])
    client = Client(
        id=doc["_id"],
        tenant_id=doc["tenant_id"],
        name=doc["name"],
        phone=doc["phone"],
        address=doc["address"],
        dob=_parse_dob(doc.get("dob")),
        status=doc["status"],
        registered_at=_parse_dob(doc.get("registered_at")),
        registration_source=doc["registration_source"],
        contact_reason=doc.get("contact_reason"),
        screening_notes=doc.get("screening_notes"),
        emergency_trigger=doc.get("emergency_trigger"),
        service_need=doc.get("service_need", False),
        cross_program_active=doc.get("cross_program_active", False),
        created_by=doc.get("created_by"),
    )
    session.add(client)
    await session.commit()
    await session.refresh(client)
    return client_to_detail(client_model_to_dict(client))


@router.post("/dedup-check", operation_id="checkClientDuplicates")
async def dedup_check(
    body: DedupCheckRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    clients = await tenant_clients(session, user["tenant_id"])
    matches = dedup_matches_for_payload(
        body.model_dump(),
        clients,
        exclude_id=body.excludeClientId,
    )
    return {"matches": matches, "threshold": 25}


@router.get("/duplicates", operation_id="listDuplicatePairs")
async def list_duplicate_pairs(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in MERGE_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Supervisor access required"})

    clients = await tenant_clients(session, user["tenant_id"])
    pairs = pairs_among(clients)
    return {
        "pairs": [
            {
                "clientA": client_to_summary(p["client_a"]),
                "clientB": client_to_summary(p["client_b"]),
                "score": p["score"],
                "matchedFields": p["matched_fields"],
            }
            for p in pairs
        ]
    }


@router.post("/merge", operation_id="mergeClients")
async def merge_clients(
    body: MergeClientsRequest,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in MERGE_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Supervisor access required"})

    tenant_id = user["tenant_id"]
    survivor_result = await session.execute(
        select(Client).where(Client.id == body.survivorId, Client.tenant_id == tenant_id)
    )
    duplicate_result = await session.execute(
        select(Client).where(Client.id == body.duplicateId, Client.tenant_id == tenant_id)
    )
    survivor = survivor_result.scalar_one_or_none()
    duplicate = duplicate_result.scalar_one_or_none()
    if not survivor or not duplicate:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Client not found"})

    duplicate.status = "merged"
    duplicate.merged_into = body.survivorId
    session.add(duplicate)
    await session.commit()
    await session.refresh(survivor)
    return client_to_detail(client_model_to_dict(survivor))


@router.get("/{client_id}", operation_id="getClient")
async def get_client(
    client_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
):
    if user.get("role") in CLIENT_DENIED_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})

    result = await session.execute(
        select(Client).where(
            Client.id == client_id,
            Client.tenant_id == user["tenant_id"],
            Client.status != "merged",
        )
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Client not found"})
    await record_phi_access(
        session,
        tenant_id=user["tenant_id"],
        actor_id=user["_id"],
        action="read",
        resource_type="client",
        resource_id=client_id,
        request=request,
        correlation_id=correlation_id,
    )
    await session.commit()
    return client_to_detail(client_model_to_dict(client))
