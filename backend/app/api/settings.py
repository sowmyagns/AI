from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth_deps import get_current_user
from app.api.deps import get_db
from app.core.permissions import require_permission, tenant_scope
from app.models.user import User
from app.schemas.company_settings import CompanySettingsRead, CompanySettingsUpdate
from app.services import company_settings_service
from app.services.account_overview_service import get_account_overview
from app.utils.api_response import success_response

router = APIRouter(prefix="/settings", tags=["Settings"])

MODULE = "admin"


@router.get("/account-overview")
def get_account_overview_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Live profile, subscription, and session details for the JWT user."""
    data = get_account_overview(db, user)
    return success_response("Account overview retrieved", data)


@router.get("/company", response_model=CompanySettingsRead)
def get_company_settings(
    tenant_id: int = Depends(tenant_scope(MODULE)), db: Session = Depends(get_db)
) -> CompanySettingsRead:
    return company_settings_service.get_or_create_settings(db, tenant_id)


@router.put("/company", response_model=CompanySettingsRead)
def update_company_settings(
    payload: CompanySettingsUpdate,
    user: User = Depends(require_permission(MODULE)),
    db: Session = Depends(get_db),
) -> CompanySettingsRead:
    return company_settings_service.update_settings(db, user.tenant_id, payload)
