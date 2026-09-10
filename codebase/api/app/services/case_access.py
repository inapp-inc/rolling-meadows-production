from fastapi import HTTPException

CASE_ROLES = {"case_manager", "supervisor", "tenant_admin", "organization_admin"}


def assert_case_access(user: dict) -> None:
    if user.get("role") not in CASE_ROLES:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied"})


def assert_caseload(user: dict, case: dict) -> None:
    if user.get("role") == "case_manager" and case.get("case_manager_id") != user["_id"]:
        raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Not your caseload"})
