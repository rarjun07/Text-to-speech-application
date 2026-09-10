from collections import defaultdict, deque
from time import monotonic

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limit: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds
        self.requests = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        now = monotonic()
        client_key = request.client.host if request.client else "unknown"
        request_times = self.requests[client_key]

        while request_times and now - request_times[0] >= self.window_seconds:
            request_times.popleft()

        if len(request_times) >= self.limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again later."},
                headers={"Retry-After": str(self.window_seconds)},
            )

        request_times.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(max(self.limit - len(request_times), 0))
        return response

