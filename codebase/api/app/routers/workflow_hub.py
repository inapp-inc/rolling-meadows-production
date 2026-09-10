from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_doc
from app.db.session import get_session
from app.services.case_store import get_client, list_cases_for_tenant, load_all_evidence, users_map
from app.services.cases import case_to_summary
from app.services.workflow import compute_stage_statuses, current_stage_number

router = APIRouter(prefix="/workflow", tags=["workflow"])

WORKFLOW_ROLES = {"case_manager", "supervisor", "tenant_admin"}


@router.get("/board", operation_id="getWorkflowBoard")
async def workflow_board(
    user: Annotated[dict, Depends(get_current_user_doc)],
    session: Annotated[AsyncSession, Depends(get_session)],
):
    if user.get("role") not in WORKFLOW_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})

    tenant_id = user["tenant_id"]
    case_manager_id = user["_id"] if user.get("role") == "case_manager" else None
    cases = await list_cases_for_tenant(session, tenant_id, case_manager_id=case_manager_id)

    items = []
    for case in cases:
        client = await get_client(session, case["client_id"], tenant_id)
        evidence = await load_all_evidence(session, case["_id"])
        stages = compute_stage_statuses(case, client, evidence)
        current = current_stage_number(stages)
        current_stage = next((stage for stage in stages if stage.get("stage") == current), stages[0] if stages else None)
        items.append(
            {
                **case_to_summary(case, client),
                "currentStageLabel": current_stage.get("label") if current_stage else "",
                "currentStageStatus": current_stage.get("status") if current_stage else "pending",
                "stageStatuses": [stage for stage in stages if stage.get("stage")],
            }
        )

    handoffs = [item for item in items if item.get("incompleteIntake") or item.get("currentStage") == 3]
    return {"board": items, "handoffs": handoffs}
