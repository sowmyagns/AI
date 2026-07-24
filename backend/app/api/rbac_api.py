"""Sidebar, roles, and permissions catalog APIs for RBAC."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth_deps import get_current_user
from app.api.deps import get_db
from app.core.permissions import require_admin, user_has_permission, user_is_admin
from app.core.rbac_constants import (
    MODULE_CATALOG,
    PERMISSION_MATRIX,
    REGISTERABLE_ROLES,
    SIDEBAR_MENU_CATALOG,
)
from app.models.permission import Permission
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import (
    PermissionItemResponse,
    RoleOptionResponse,
    SidebarChildResponse,
    SidebarItemResponse,
    UserResponse,
)
from app.schemas.rbac import UserCreate, UserUpdate
from app.services.auth_service import get_user_with_role
from app.services.settings_service import SettingsService

router = APIRouter(tags=["rbac"])


def _user_can_see_module(user: User, module: str) -> bool:
    if user_is_admin(user):
        return True
    return user_has_permission(user, module)


def _svc(db: Session, admin: User) -> SettingsService:
    return SettingsService(db, admin)


@router.get("/roles", response_model=list[RoleOptionResponse])
def list_registerable_roles(db: Session = Depends(get_db)):
    """Public list of roles shown on the Register page."""
    items = []
    for name in REGISTERABLE_ROLES:
        spec = PERMISSION_MATRIX.get(name, {})
        items.append(
            RoleOptionResponse(
                id=name.lower().replace(" ", "_"),
                name=name,
                description=spec.get("description", ""),
            )
        )
    return items


@router.get("/roles/tenant", response_model=list[dict])
def list_tenant_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Roles defined for the authenticated user's company."""
    roles = db.scalars(
        select(Role).where(Role.tenant_id == current_user.tenant_id).order_by(Role.name)
    ).all()
    return [
        {
            "id": r.id,
            "role_name": r.name,
            "description": r.description,
            "permissions": r.permissions or [],
        }
        for r in roles
    ]


@router.get("/permissions", response_model=list[PermissionItemResponse])
def list_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permission catalog (module + permission name)."""
    rows = list(db.scalars(select(Permission).order_by(Permission.module_name)).all())
    if rows:
        return [
            PermissionItemResponse(
                id=p.id,
                module_name=p.module_name,
                permission_name=p.permission_name,
                code=f"{p.module_name}:{p.permission_name}"
                if p.permission_name != "access"
                else p.module_name,
            )
            for p in rows
        ]
    # Fallback from constants if catalog not seeded yet
    items = []
    for mod in MODULE_CATALOG:
        items.append(
            PermissionItemResponse(
                module_name=mod["code"],
                permission_name="access",
                code=mod["code"],
            )
        )
    return items


@router.get("/sidebar", response_model=list[SidebarItemResponse])
def get_sidebar_menus(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return only sidebar menus allowed for the logged-in role."""
    db.refresh(current_user, ["roles"])
    menus: list[SidebarItemResponse] = []
    for section in SIDEBAR_MENU_CATALOG:
        if section["key"] == "alerts" and "Operator" in [r.name for r in current_user.roles]:
            continue
        children_src = section.get("children") or []
        # Parent module must be granted (prevents Operator seeing Masters via Machines).
        if not _user_can_see_module(current_user, section["module"]):
            # Exception: HR/Attendance — show truncated HR section when only attendance is granted.
            if section["key"] == "hr" and _user_can_see_module(current_user, "attendance"):
                menus.append(
                    SidebarItemResponse(
                        key=section["key"],
                        label=section["label"],
                        path=section.get("path"),
                        module=section["module"],
                        children=[
                            SidebarChildResponse(
                                label=c["label"],
                                path=c["path"],
                                module=c["module"],
                            )
                            for c in children_src
                            if _user_can_see_module(current_user, c["module"])
                        ],
                    )
                )
            continue

        if children_src:
            allowed_children = [
                SidebarChildResponse(
                    label=c["label"],
                    path=c["path"],
                    module=c["module"],
                )
                for c in children_src
                if _user_can_see_module(current_user, c["module"])
            ]
            if allowed_children:
                menus.append(
                    SidebarItemResponse(
                        key=section["key"],
                        label=section["label"],
                        path=section.get("path"),
                        module=section["module"],
                        children=allowed_children,
                    )
                )
            continue

        menus.append(
            SidebarItemResponse(
                key=section["key"],
                label=section["label"],
                path=section.get("path"),
                module=section["module"],
                children=[],
            )
        )
    return menus


@router.get("/sidebar/labels", response_model=list[str])
def get_sidebar_labels(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Flat label list of allowed menus (for compact clients)."""
    menus = get_sidebar_menus(current_user=current_user, db=db)
    labels: list[str] = []
    for m in menus:
        labels.append(m.label)
        for c in m.children:
            labels.append(c.label)
    return labels


@router.get("/profile", response_model=UserResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = get_user_with_role(db, current_user)
    data["email_verified"] = current_user.email_verified
    return UserResponse(**data)


# ---------------------------------------------------------------------------
# Company-scoped user management (Admin only)
# ---------------------------------------------------------------------------
@router.get("/users")
def list_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return _svc(db, admin).list_users()


@router.post("/users", status_code=201)
def create_user(
    payload: UserCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return _svc(db, admin).create_user(payload, request)


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return _svc(db, admin).update_user(user_id, payload, request)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return _svc(db, admin).delete_user(user_id, request)


@router.post("/users/{user_id}/reset-password")
def admin_reset_user_password(
    user_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: send a password reset link to the user's company email."""
    from app.services.password_reset_service import PasswordResetService

    message = PasswordResetService(db).admin_trigger_reset(
        user_id=user_id,
        tenant_id=admin.tenant_id,
        admin_user_id=admin.id,
        request=request,
    )
    return {"success": True, "message": message}
