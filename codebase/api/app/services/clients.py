import re
import uuid
from datetime import date

from app.models.client import Client
from app.services.deduplication import find_duplicates, normalize, normalize_phone


def client_model_to_dict(client: Client) -> dict:
    return {
        "_id": client.id,
        "tenant_id": client.tenant_id,
        "name": client.name,
        "phone": client.phone,
        "address": client.address,
        "dob": client.dob.isoformat() if client.dob else None,
        "status": client.status,
        "registered_at": client.registered_at.isoformat() if client.registered_at else None,
        "registration_source": client.registration_source,
        "contact_reason": client.contact_reason,
        "screening_notes": client.screening_notes,
        "emergency_trigger": client.emergency_trigger,
        "service_need": client.service_need,
        "cross_program_active": client.cross_program_active,
        "merged_into": client.merged_into,
        "created_by": client.created_by,
    }


def client_to_summary(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "name": doc.get("name", ""),
        "phone": doc.get("phone", ""),
        "address": doc.get("address", ""),
        "dob": doc.get("dob"),
        "status": doc.get("status", "active"),
        "crossProgramActive": bool(doc.get("cross_program_active", False)),
    }


def client_to_detail(doc: dict) -> dict:
    summary = client_to_summary(doc)
    summary.update(
        {
            "registeredAt": doc.get("registered_at"),
            "registrationSource": doc.get("registration_source", "walk_in"),
            "contactReason": doc.get("contact_reason"),
            "screeningNotes": doc.get("screening_notes"),
        }
    )
    return summary


def search_clients(clients: list[dict], query: str) -> list[dict]:
    q = normalize(query)
    if not q:
        return clients
    phone_q = normalize_phone(query)
    results = []
    for client in clients:
        name = normalize(client.get("name", ""))
        phone = normalize(client.get("phone", ""))
        address = normalize(client.get("address", ""))
        if q in name or q in address or q in phone:
            results.append(client)
            continue
        from app.services.deduplication import levenshtein

        if name and levenshtein(name, q) <= 2:
            results.append(client)
            continue
        if phone_q and phone_q in normalize_phone(client.get("phone", "")):
            results.append(client)
    return results


def new_client_id() -> str:
    return f"cli-{uuid.uuid4().hex[:12]}"


def validate_create(payload: dict) -> None:
    if not (payload.get("name") or "").strip():
        raise ValueError("name is required")
    if not (payload.get("phone") or "").strip():
        raise ValueError("phone is required")
    if not (payload.get("address") or "").strip():
        raise ValueError("address is required")


def build_client_doc(payload: dict, tenant_id: str, actor_id: str) -> dict:
    return {
        "_id": new_client_id(),
        "tenant_id": tenant_id,
        "name": payload["name"].strip(),
        "phone": payload["phone"].strip(),
        "address": payload["address"].strip(),
        "dob": payload.get("dob") or None,
        "status": "active",
        "registered_at": date.today().isoformat(),
        "registration_source": "registration",
        "contact_reason": payload.get("contactReason"),
        "screening_notes": payload.get("screeningNotes"),
        "emergency_trigger": payload.get("emergencyTrigger"),
        "service_need": bool(payload.get("serviceNeed")),
        "cross_program_active": False,
        "created_by": actor_id,
    }


def dedup_matches_for_payload(payload: dict, clients: list[dict], *, exclude_id: str | None = None, threshold: int = 25) -> list[dict]:
    partial = {"name": payload.get("name"), "phone": payload.get("phone"), "dob": payload.get("dob")}
    raw = find_duplicates(partial, clients, exclude_id=exclude_id, threshold=threshold)
    return [
        {
            "client": client_to_summary(m["client"]),
            "score": m["score"],
            "matchedFields": m["matched_fields"],
        }
        for m in raw
    ]
