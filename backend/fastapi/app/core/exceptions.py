"""
Centralized error handling and HTTP exception handlers.
"""
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from jose import JWTError

logger = logging.getLogger(__name__)


def success_response(data=None, message: str = "Success", status_code: int = 200) -> dict:
    return {"success": True, "message": message, "data": data}


def error_response(message: str, errors=None, status_code: int = 400) -> dict:
    response = {"success": False, "message": message}
    if errors:
        response["errors"] = errors
    return response


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response("Validation failed", errors=errors),
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error(f"Database integrity error: {exc}")
    msg = str(exc.orig) if exc.orig else "Database constraint violation"
    if "Duplicate entry" in msg or "UNIQUE" in msg.upper():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=error_response("A record with this value already exists"),
        )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=error_response("Database integrity error"),
    )


async def operational_error_handler(request: Request, exc: OperationalError):
    logger.critical(f"Database operational error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=error_response("Database is temporarily unavailable"),
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response("An internal server error occurred"),
    )
