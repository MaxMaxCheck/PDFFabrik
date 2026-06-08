import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from lib.internal_auth import INTERNAL_TOKEN_HEADER


class InternalAuthMiddleware(BaseHTTPMiddleware):
    """Nur Anfragen mit gültigem internem Token (Next.js-Gateway)."""

    _PUBLIC_PATHS = frozenset({"/", "/v1/health", "/health"})

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self._PUBLIC_PATHS:
            return await call_next(request)

        configured = os.environ.get("PDF_INTERNAL_SERVICE_TOKEN", "").strip()
        if not configured:
            return await call_next(request)

        got = (request.headers.get(INTERNAL_TOKEN_HEADER) or "").strip()
        if got != configured:
            return JSONResponse({"detail": "Nicht autorisiert"}, status_code=403)

        return await call_next(request)
