"""Serve the built React SPA under the configured base path."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def register_spa_routes(app: FastAPI, static_dir: Path, base_path: str) -> None:
    """Mount static assets and SPA fallback routes."""
    prefix = base_path or ""
    assets_dir = static_dir / "assets"
    css_dir = static_dir / "css"

    if assets_dir.is_dir():
        mount = f"{prefix}/assets" if prefix else "/assets"
        app.mount(mount, StaticFiles(directory=assets_dir), name="spa-assets")

    if css_dir.is_dir():
        mount = f"{prefix}/css" if prefix else "/css"
        app.mount(mount, StaticFiles(directory=css_dir), name="spa-css")

    index_file = static_dir / "index.html"

    async def serve_index() -> FileResponse:
        return FileResponse(index_file)

    if prefix:
        app.add_api_route(prefix, serve_index, methods=["GET"], include_in_schema=False)
        app.add_api_route(f"{prefix}/", serve_index, methods=["GET"], include_in_schema=False)
        app.add_api_route(
            f"{prefix}/{{full_path:path}}",
            serve_index,
            methods=["GET"],
            include_in_schema=False,
        )
    else:
        app.add_api_route("/", serve_index, methods=["GET"], include_in_schema=False)
        app.add_api_route("/{full_path:path}", serve_index, methods=["GET"], include_in_schema=False)
