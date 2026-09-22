from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def _effective_scheme(self, request: Request) -> str:
        if settings.trust_proxy:
            forwarded = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
            if forwarded in ("http", "https"):
                return forwarded
        return request.url.scheme

    async def dispatch(self, request: Request, call_next) -> Response:
        scheme = self._effective_scheme(request)
        if settings.enforce_https and scheme != "https":
            client = request.client.host if request.client else ""
            if client not in ("127.0.0.1", "::1"):
                return Response(
                    status_code=403,
                    content="HTTPS is required",
                    media_type="text/plain",
                )
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        if settings.enforce_https or settings.public_url.startswith("https://"):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response
