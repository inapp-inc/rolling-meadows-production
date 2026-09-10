import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import async_session_factory, close_db, init_db
from app.routers import admin, auth, catalog, case_stages, cases, clients, documents, enrollments, health, liaison, platform, reports, workflow_hub
from app.seed.catalog import seed_catalog_if_empty
from app.seed.cases import seed_cases_if_empty
from app.seed.clients import seed_clients_if_empty
from app.seed.custom_reports import seed_custom_reports_if_empty
from app.seed.users import seed_auth_data_if_empty

app = FastAPI(
    title="Rolling Meadows Case Management API",
    version="0.3.0",
    description="React + FastAPI + PostgreSQL — modular API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODULE_ROUTERS = {
    "health": health.router,
    "auth": auth.router,
    "admin": admin.router,
    "clients": clients.router,
    "catalog": catalog.router,
    "cases": cases.router,
    "enrollments": enrollments.router,
    "liaison": liaison.router,
    "workflow": workflow_hub.router,
    "documents": documents.router,
    "reports": reports.router,
    "platform": platform.router,
}


@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["x-correlation-id"] = correlation_id
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", None)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "An unexpected error occurred",
            "correlationId": correlation_id,
        },
    )


for module_name, router in MODULE_ROUTERS.items():
    if module_name in settings.enabled_modules:
        app.include_router(router)

if "cases" in settings.enabled_modules:
    app.include_router(case_stages.router)


@app.on_event("startup")
async def on_startup():
    await init_db()
    if "auth" in settings.enabled_modules:
        async with async_session_factory() as session:
            await seed_auth_data_if_empty(session)
    if "clients" in settings.enabled_modules:
        async with async_session_factory() as session:
            await seed_clients_if_empty(session)
    if "catalog" in settings.enabled_modules:
        async with async_session_factory() as session:
            await seed_catalog_if_empty(session)
    if "cases" in settings.enabled_modules:
        async with async_session_factory() as session:
            await seed_cases_if_empty(session)
    if "reports" in settings.enabled_modules:
        async with async_session_factory() as session:
            await seed_custom_reports_if_empty(session)


@app.on_event("shutdown")
async def on_shutdown():
    await close_db()
