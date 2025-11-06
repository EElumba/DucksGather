class ServiceError(Exception):
    """Base class for service layer errors."""


class ValidationError(ServiceError):
    """Invalid input or failed validation (HTTP 400)."""


class NotFoundError(ServiceError):
    """Resource not found (HTTP 404)."""


class ForbiddenError(ServiceError):
    """Action not allowed for this user (HTTP 403)."""


class ConflictError(ServiceError):
    """Conflict or duplicate (HTTP 409)."""
