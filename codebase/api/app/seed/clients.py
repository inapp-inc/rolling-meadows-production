from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.client import Client


def _d(iso: str) -> date:
    year, month, day = (int(part) for part in iso.split("-"))
    return date(year, month, day)


# Aligned with Docs/ui/js/seed/seedData.js (Mary Smith + senior caseload).
DEMO_CLIENTS = [
    {
        "id": "cli-mary-smith",
        "name": "Mary Smith",
        "phone": "(847) 555-0142",
        "address": "412 Oak Lane, Springfield, IL 62701",
        "dob": date(1948, 3, 12),
        "status": "active",
        "cross_program_active": True,
    },
    {
        "id": "cli-john-davis",
        "name": "John Davis",
        "phone": "(847) 555-0201",
        "address": "88 Oak Street, Springfield, IL",
        "dob": _d("1938-07-22"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-elena-rodriguez",
        "name": "Elena Rodriguez",
        "phone": "(847) 555-0202",
        "address": "15 Pine Court, Springfield, IL",
        "dob": _d("1940-11-03"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-robert-kim",
        "name": "Robert Kim",
        "phone": "(847) 555-0203",
        "address": "902 Central Rd, Springfield, IL",
        "dob": _d("1935-04-18"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-dorothy-williams",
        "name": "Dorothy Williams",
        "phone": "(847) 555-0204",
        "address": "77 Birch Ave, Springfield, IL",
        "dob": _d("1944-09-30"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-frank-miller",
        "name": "Frank Miller",
        "phone": "(847) 555-0205",
        "address": "203 Willow Dr, Springfield, IL",
        "dob": _d("1939-01-12"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-helen-chen",
        "name": "Helen Chen",
        "phone": "(847) 555-0206",
        "address": "44 Maple St, Springfield, IL",
        "dob": _d("1941-06-25"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-george-patel",
        "name": "George Patel",
        "phone": "(847) 555-0207",
        "address": "561 Elm Way, Springfield, IL",
        "dob": _d("1937-12-08"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-ruth-anderson",
        "name": "Ruth Anderson",
        "phone": "(847) 555-0208",
        "address": "19 Cedar Ln, Springfield, IL",
        "dob": _d("1943-02-14"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-james-wilson",
        "name": "James Wilson",
        "phone": "(847) 555-0209",
        "address": "330 Park Blvd, Springfield, IL",
        "dob": _d("1936-08-19"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-margaret-lee",
        "name": "Margaret Lee",
        "phone": "(847) 555-0210",
        "address": "67 Spruce Ct, Springfield, IL",
        "dob": _d("1945-05-07"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-william-brown",
        "name": "William Brown",
        "phone": "(847) 555-0211",
        "address": "118 Ash St, Springfield, IL",
        "dob": _d("1934-10-31"),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-betty-taylor",
        "name": "Betty Taylor",
        "phone": "(847) 555-0212",
        "address": "245 Hickory Rd, Springfield, IL",
        "dob": _d("1942-07-04"),
        "status": "active",
        "cross_program_active": False,
    },
]


async def seed_clients_if_empty(session: AsyncSession) -> None:
    for seed in DEMO_CLIENTS:
        result = await session.execute(select(Client).where(Client.id == seed["id"]))
        if result.scalar_one_or_none():
            continue
        session.add(
            Client(
                id=seed["id"],
                tenant_id=settings.default_tenant_id,
                name=seed["name"],
                phone=seed["phone"],
                address=seed["address"],
                dob=seed["dob"],
                status=seed["status"],
                registered_at=date.today(),
                registration_source="seed",
                cross_program_active=seed["cross_program_active"],
            )
        )
    await session.commit()
