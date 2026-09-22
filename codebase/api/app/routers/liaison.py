from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.catalog.risk_domains import PROGRAM_LABELS
from app.core.deps import get_correlation_id, get_current_user_doc
from app.db.session import get_session
from app.models.case import Case
from app.models.client import Client
from app.models.user import User
from app.seed.users import user_model_to_dict
from app.services.phi_access import record_phi_access

router = APIRouter(prefix="/liaison", tags=["liaison"])

LIAISON_ROLES = {"cross_program_liaison", "supervisor", "tenant_admin"}


@router.get("/lookup", operation_id="liaisonLookup")
async def liaison_lookup(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
    q: str = Query(default="", min_length=0),
):
    if user.get("role") not in LIAISON_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Liaison access only"})

    if not q.strip():
        return {"items": []}

    needle = q.strip().lower()
    tenant_id = user["tenant_id"]

    client_result = await session.execute(
        select(Client).where(
            Client.tenant_id == tenant_id,
            Client.status != "merged",
            or_(
                Client.name.ilike(f"%{needle}%"),
                Client.phone.ilike(f"%{needle}%"),
            ),
        )
    )
    matched_clients = client_result.scalars().all()
    if not matched_clients:
        return {"items": []}

    client_ids = [client.id for client in matched_clients]
    clients_by_id = {client.id: client for client in matched_clients}

    case_result = await session.execute(
        select(Case).where(
            Case.tenant_id == tenant_id,
            Case.status == "active",
            Case.client_id.in_(client_ids),
        )
    )
    cases = case_result.scalars().all()

    user_result = await session.execute(select(User).where(User.tenant_id == tenant_id))
    users_by_id = {row.id: user_model_to_dict(row) for row in user_result.scalars().all()}

    rows = []
    for case in cases:
        client = clients_by_id.get(case.client_id)
        if not client:
            continue
        cm = users_by_id.get(case.case_manager_id, {})
        rows.append(
            {
                "clientName": client.name,
                "programLabel": PROGRAM_LABELS.get(case.program_id, case.program_id),
                "caseManagerName": cm.get("name", "Unassigned"),
                "caseManagerStatus": cm.get("status", "Active"),
                "contactPhone": cm.get("phone") or client.phone or "—",
            }
        )

    rows.sort(key=lambda row: row["clientName"] or "")
    await record_phi_access(
        session,
        tenant_id=tenant_id,
        actor_id=user["_id"],
        action="search",
        resource_type="client",
        detail={"count": len(rows), "hasQuery": True},
        request=request,
        correlation_id=correlation_id,
    )
    await session.commit()
    return {"items": rows}
