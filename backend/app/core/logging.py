import logging
import structlog
import uuid
import sys
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import time

def redact_dict(d: dict, keys_to_redact: list) -> dict:
    if not isinstance(d, dict):
        return d
    out = {}
    for k, v in d.items():
        if any(red_key.lower() in k.lower() for red_key in keys_to_redact):
            out[k] = "[REDACTED]"
        elif isinstance(v, dict):
            out[k] = redact_dict(v, keys_to_redact)
        else:
            out[k] = v
    return out

class RedactingProcessor:
    def __init__(self, keys_to_redact):
        self.keys = keys_to_redact

    def __call__(self, logger, method_name, event_dict):
        return redact_dict(event_dict, self.keys)

def setup_logging():
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.contextvars.merge_contextvars,
            RedactingProcessor(["authorization", "password", "token", "email"]),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging to redirect to structlog
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)

class StructlogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(requestId=req_id)
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            response.headers["x-request-id"] = req_id
            
            # Using request.scope['route'] to get pattern if available, fallback to url.path
            route_pattern = request.url.path
            if "endpoint" in request.scope:
                route = request.scope.get("route")
                if route:
                    route_pattern = getattr(route, "path", request.url.path)

            duration_ms = int((time.time() - start_time) * 1000)
            
            user_id = None
            if hasattr(request.state, "user") and request.state.user:
                user_id = request.state.user.id

            logger = structlog.get_logger("http_request")
            logger.info(
                "http_request",
                event="http_request",
                method=request.method,
                path=route_pattern,
                statusCode=response.status_code,
                duration_ms=duration_ms,
                userId=user_id
            )
            return response
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            logger = structlog.get_logger("http_request")
            logger.error(
                "http_request_failed",
                event="http_request_failed",
                method=request.method,
                path=request.url.path,
                duration_ms=duration_ms,
                error=str(e)
            )
            raise
