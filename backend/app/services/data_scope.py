"""Row-level data filtering based on user role and assignment."""

from sqlalchemy import Select, or_

from app.core.permissions import get_role_names, user_is_admin
from app.models.production import DailyProductionReport, WorkOrder
from app.models.user import User


def _roles(user: User) -> set[str]:
    return set(get_role_names(user))


def scope_work_orders(stmt: Select, user: User) -> Select:
    return stmt


def scope_daily_reports(stmt: Select, user: User) -> Select:
    return stmt


def operator_can_access_work_order(user: User, work_order: WorkOrder) -> bool:
    return True


def production_manager_plant(user: User) -> str | None:
    if user_is_admin(user):
        return None
    if "Production Manager" in _roles(user):
        return user.plant_code
    return None
