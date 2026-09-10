from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.client import Client


DEMO_CLIENTS = [
    {
        "id": "cli-mary-smith",
        "name": "Mary Smith",
        "phone": "(847) 555-0142",
        "address": "412 Oak Lane, Rolling Meadows, IL 60008",
        "dob": date(1948, 3, 12),
        "status": "active",
        "cross_program_active": True,
    },
    {
        "id": "cli-john-davis",
        "name": "John Davis",
        "phone": "(847) 555-0199",
        "address": "88 Elm Street, Rolling Meadows, IL 60008",
        "dob": date(1955, 7, 21),
        "status": "active",
        "cross_program_active": False,
    },
    {
        "id": "cli-maria-garcia",
        "name": "Maria Garcia",
        "phone": "(847) 555-0177",
        "address": "15 Pine Court, Rolling Meadows, IL 60008",
        "dob": date(1962, 11, 4),
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
