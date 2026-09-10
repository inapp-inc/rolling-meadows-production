PLATFORM_ADMIN = "platform_admin"
TENANT_ADMIN = "tenant_admin"
ORGANIZATION_ADMIN = "organization_admin"

OPERATIONAL_ROLES = frozenset(
    {"supervisor", "case_manager", "cross_program_liaison", "auditor"}
)

TENANT_ADMIN_ROLES = frozenset({TENANT_ADMIN, ORGANIZATION_ADMIN})

TENANT_ASSIGNABLE_ROLES = OPERATIONAL_ROLES | {ORGANIZATION_ADMIN}

ORG_ADMIN_ASSIGNABLE_ROLES = OPERATIONAL_ROLES

ADMIN_ROLES = frozenset({PLATFORM_ADMIN, TENANT_ADMIN, ORGANIZATION_ADMIN})

ALL_ROLES = ADMIN_ROLES | OPERATIONAL_ROLES


def assignable_roles_for(creator_role: str) -> frozenset[str]:
    if creator_role == TENANT_ADMIN:
        return TENANT_ASSIGNABLE_ROLES
    if creator_role == ORGANIZATION_ADMIN:
        return ORG_ADMIN_ASSIGNABLE_ROLES
    return frozenset()


def can_manage_user(actor_role: str, target_role: str) -> bool:
    if actor_role == TENANT_ADMIN:
        return target_role != TENANT_ADMIN
    if actor_role == ORGANIZATION_ADMIN:
        return target_role in OPERATIONAL_ROLES
    return False
