"""
Service layer package.

Holds business logic separate from Flask route handlers so routes stay thin and
testable. Services should not commit/rollback; keep transaction boundaries in
routes for composability.
"""
