from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    from sqlalchemy import text

    from app.db.base import Base
    from app.models import case, catalog, client, custom_report, document, i18n, platform, tenant, user  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                """
                ALTER TABLE tenants
                    ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ,
                    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ
                """
            )
        )
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR(64)")
        )


async def close_db() -> None:
    await engine.dispose()
