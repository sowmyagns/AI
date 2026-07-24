"""Shared dependencies for Operator /api routes."""

from fastapi import Depends, HTTPException, status

from app.api.auth_deps import get_current_user
from app.core.permissions import (
    MODULE_FORBIDDEN_MESSAGE,
    get_role_names,
    user_has_permission,
    user_is_admin,
)
from app.models.user import User

FORBIDDEN_MODULES = frozenset()

MODULE_MAP = {
    "dashboard": "dashboard",
    "products": "production",
    "bom": "production",
    "machines": "production",
    "production": "production",
    "workorders": "production",
    "shopfloor": "production",
    "allocation": "production",
    "batches": "production",
    "notifications": "production",
    "ai": "production",
}


def _check_operator_restrictions(user: User, module_key: str) -> None:
    if module_key == "notifications":
        return
    rbac_module = MODULE_MAP.get(module_key, module_key)
    if not user_has_permission(user, rbac_module):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=MODULE_FORBIDDEN_MESSAGE,
        )


def require_api_access(module_key: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        _check_operator_restrictions(current_user, module_key)
        return current_user

    return dependency


def require_tenant(module_key: str):
    def dependency(current_user: User = Depends(require_api_access(module_key))) -> tuple[User, int]:
        return current_user, current_user.tenant_id

    return dependency


def deny_delete_for_operator(current_user: User = Depends(get_current_user)) -> User:
    return current_user
