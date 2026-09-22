import base64
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_correlation_id, get_current_user_doc
from app.db.session import get_session
from app.models.case import Case
from app.models.document import Document
from app.services.case_access import assert_case_access
from app.services.case_store import audit, get_case
from app.services.phi_access import record_phi_access

router = APIRouter(prefix="/documents", tags=["documents"])

MAX_BYTES = 512 * 1024


class DocumentLinkPayload(BaseModel):
    caseId: str | None = None
    clientId: str
    filename: str
    externalUrl: str = Field(min_length=1)
    stageContext: str | None = None


class DocumentUploadPayload(BaseModel):
    caseId: str | None = None
    clientId: str
    filename: str
    mimeType: str
    dataBase64: str
    stageContext: str | None = None


def _document_to_item(doc: Document) -> dict:
    return {
        "id": doc.id,
        "caseId": doc.case_id,
        "clientId": doc.client_id,
        "filename": doc.filename,
        "sourceType": doc.source_type,
        "mimeType": doc.mime_type,
        "size": doc.size,
        "externalUrl": doc.external_url,
        "uploadedAt": doc.uploaded_at.isoformat(),
        "stageContext": doc.stage_context,
    }


async def _case_ids_for_manager(session: AsyncSession, tenant_id: str, user_id: str) -> list[str]:
    result = await session.execute(
        select(Case.id).where(Case.tenant_id == tenant_id, Case.case_manager_id == user_id)
    )
    return [row[0] for row in result.all()]


@router.get("", operation_id="listDocuments")
async def list_documents(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
    caseId: str | None = None,
):
    assert_case_access(user)
    tenant_id = user["tenant_id"]
    query = select(Document).where(Document.tenant_id == tenant_id)

    if caseId:
        query = query.where(Document.case_id == caseId)
    elif user.get("role") == "case_manager":
        case_ids = await _case_ids_for_manager(session, tenant_id, user["_id"])
        query = query.where(Document.case_id.in_(case_ids))

    query = query.order_by(Document.uploaded_at.desc())
    result = await session.execute(query)
    docs = result.scalars().all()
    items = [_document_to_item(doc) for doc in docs]
    await record_phi_access(
        session,
        tenant_id=tenant_id,
        actor_id=user["_id"],
        action="list",
        resource_type="document",
        resource_id=caseId,
        detail={"count": len(items), "hasQuery": bool(caseId)},
        request=request,
        correlation_id=correlation_id,
    )
    await session.commit()
    return {"items": items}


@router.get("/{document_id}/download", operation_id="downloadDocument")
async def download_document(
    document_id: str,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
    request: Request,
    correlation_id: Annotated[str | None, Depends(get_correlation_id)],
):
    assert_case_access(user)
    result = await session.execute(
        select(Document).where(
            Document.id == document_id,
            Document.tenant_id == user["tenant_id"],
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Document not found"})

    export_format = "link" if doc.source_type == "url" else "file"
    await record_phi_access(
        session,
        tenant_id=user["tenant_id"],
        actor_id=user["_id"],
        action="export",
        resource_type="document",
        resource_id=document_id,
        detail={"exportFormat": export_format},
        request=request,
        correlation_id=correlation_id,
    )
    await session.commit()

    if doc.source_type == "url" and doc.external_url:
        return {"redirectUrl": doc.external_url, "filename": doc.filename}

    if not doc.data_base64:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "File content not available"})

    try:
        raw = base64.b64decode(doc.data_base64)
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"error": "invalid_file", "message": "Stored file is invalid"}) from exc

    media = doc.mime_type or "application/octet-stream"
    return Response(
        content=raw,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{doc.filename}"'},
    )


@router.post("/link", operation_id="addDocumentLink", status_code=201)
async def add_link(
    body: DocumentLinkPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    if body.caseId:
        case = await get_case(session, body.caseId, user["tenant_id"])
        if case.get("status") == "closed":
            raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    doc_id = f"doc-{uuid.uuid4().hex[:10]}"
    session.add(
        Document(
            id=doc_id,
            tenant_id=user["tenant_id"],
            case_id=body.caseId,
            client_id=body.clientId,
            filename=body.filename.strip(),
            source_type="url",
            external_url=body.externalUrl.strip(),
            uploaded_by=user["_id"],
            uploaded_at=datetime.now(timezone.utc),
            stage_context=body.stageContext,
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "document_linked", body.caseId or body.clientId)
    await session.commit()
    return {"id": doc_id}


@router.post("/upload", operation_id="uploadDocument", status_code=201)
async def upload_document(
    body: DocumentUploadPayload,
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    assert_case_access(user)
    try:
        raw = base64.b64decode(body.dataBase64)
    except Exception as exc:
        raise HTTPException(status_code=422, detail={"error": "validation", "message": "Invalid base64"}) from exc
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail={"error": "too_large", "message": "Max 512KB in prototype parity"})

    if body.caseId:
        case = await get_case(session, body.caseId, user["tenant_id"])
        if case.get("status") == "closed":
            raise HTTPException(status_code=400, detail={"error": "read_only", "message": "Case is closed"})

    doc_id = f"doc-{uuid.uuid4().hex[:10]}"
    session.add(
        Document(
            id=doc_id,
            tenant_id=user["tenant_id"],
            case_id=body.caseId,
            client_id=body.clientId,
            filename=body.filename.strip(),
            source_type="file",
            mime_type=body.mimeType,
            size=len(raw),
            data_base64=body.dataBase64,
            uploaded_by=user["_id"],
            uploaded_at=datetime.now(timezone.utc),
            stage_context=body.stageContext,
        )
    )
    await audit(session, user["tenant_id"], user["_id"], "document_uploaded", body.caseId or body.clientId)
    await session.commit()
    return {"id": doc_id, "size": len(raw)}
