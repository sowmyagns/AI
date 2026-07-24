import time
import uuid

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logging_config import get_logger, setup_logging

from app.api.accounts import router as accounts_router
from app.api.admin import router as admin_router
from app.api.ai_assistant import router as ai_assistant_router
from app.api.alerts import router as alerts_router
from app.api.analytics import router as analytics_router
from app.api.audit_logs import router as audit_logs_router
from app.api.auth import router as auth_router
from app.api.audit_api import router as audit_api_router
from app.api.login_history import router as login_history_router
from app.api.platform_api import router as platform_router
from app.api.rbac_api import router as rbac_api_router
from app.middleware.audit_middleware import AuditMiddleware
from app.api.dispatch import router as dispatch_router
from app.api.documents import router as documents_router
from app.api.factory_monitor import router as factory_monitor_router
from app.api.forecasting import router as forecasting_router
from app.api.hr import router as hr_router
from app.api.integration import router as integration_router
from app.api.inventory import router as inventory_router
from app.api.iot import router as iot_router
from app.api.maintenance import router as maintenance_router
from app.api.procurement import router as procurement_router
from app.api.production_scheduling import router as production_scheduling_router
from app.api.quality import router as quality_router
from app.api.sales import router as sales_router
from app.api.settings import router as company_settings_router
from app.api.supply_chain import router as supply_chain_router
from app.api.task_management import router as task_management_router
from app.api.warehouse import router as warehouse_router
from app.routers import (
    dashboard_api_router,
    masters_api_router,
    notifications_api_router,
    operator_api_router,
    production_api_router,
    settings_api_router,
)
from app.core.database import engine
from app.models.base import Base

# Import all models so they register with Base.metadata
from app.models import (  # noqa: F401
    accounts,
    ai_conversation,
    alert,
    bom,
    company_settings,
    department,
    document,
    erp_notification,
    hr,
    inventory,
    machine,
    maintenance,
    notification,
    permission,
    platform,
    procurement,
    production,
    product,
    quality,
    role,
    sales,
    security,
    task,
    tenant,
    user,
)

settings = get_settings()
setup_logging("INFO")
logger = get_logger("gns_insights")

app = FastAPI(title="GNS Insights API", version="1.0.0")

app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    """Attach a request id, time the request, and log the outcome."""
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        elapsed = (time.perf_counter() - start) * 1000
        logger.exception(
            "request_failed id=%s %s %s (%.1fms)",
            request_id,
            request.method,
            request.url.path,
            elapsed,
        )
        raise
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "id=%s %s %s -> %s (%.1fms)",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if request.url.path.startswith("/api/"):
        from app.utils.api_response import error_response

        return JSONResponse(
            status_code=exc.status_code,
            content=error_response(str(exc.detail), errors=[str(exc.detail)]),
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": getattr(request.state, "request_id", None)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    if request.url.path.startswith("/api/"):
        from app.utils.api_response import error_response

        errors = [f"{e['loc']}: {e['msg']}" for e in exc.errors()]
        return JSONResponse(status_code=422, content=error_response("Validation failed", errors=errors))
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("database_error id=%s", getattr(request.state, "request_id", None))
    return JSONResponse(
        status_code=500,
        content={
            "detail": "A database error occurred.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_error id=%s", getattr(request.state, "request_id", None))
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error.",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "environment": settings.environment}


@app.get("/health/db", tags=["health"])
def health_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except SQLAlchemyError:
        return JSONResponse(status_code=503, content={"status": "error", "database": "unreachable"})


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    # Add phone column if missing (for existing DBs)
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE roles ADD COLUMN permissions JSON NOT NULL DEFAULT '[]'"
                )
            )
    except Exception:
        pass  # Column may already exist
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET email_verified = 1 WHERE email_verified = 0"))
    except Exception:
        pass
    _user_security_columns = [
        "ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN locked_until DATETIME",
        "ALTER TABLE users ADD COLUMN last_activity_at DATETIME",
    ]
    for ddl in _user_security_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _product_columns = [
        "ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE products ADD COLUMN max_stock INTEGER NOT NULL DEFAULT 100",
        "ALTER TABLE products ADD COLUMN current_stock INTEGER NOT NULL DEFAULT 1",
    ]
    for ddl in _product_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _access_log_columns = [
        "ALTER TABLE access_logs ADD COLUMN company_id INTEGER",
        "ALTER TABLE access_logs ADD COLUMN company_name VARCHAR(255)",
        "ALTER TABLE access_logs ADD COLUMN full_name VARCHAR(255)",
        "ALTER TABLE access_logs ADD COLUMN email VARCHAR(255)",
        "ALTER TABLE access_logs ADD COLUMN role VARCHAR(100)",
        "ALTER TABLE access_logs ADD COLUMN module_name VARCHAR(64)",
        "ALTER TABLE access_logs ADD COLUMN login_status VARCHAR(32)",
        "ALTER TABLE access_logs ADD COLUMN browser VARCHAR(128)",
        "ALTER TABLE access_logs ADD COLUMN operating_system VARCHAR(128)",
        "ALTER TABLE access_logs ADD COLUMN device_type VARCHAR(32)",
        "ALTER TABLE access_logs ADD COLUMN session_id VARCHAR(64)",
        "ALTER TABLE access_logs ADD COLUMN login_at DATETIME",
        "ALTER TABLE access_logs ADD COLUMN logout_at DATETIME",
        "ALTER TABLE access_logs ADD COLUMN details TEXT",
    ]
    for ddl in _access_log_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE access_logs SET company_id = tenant_id WHERE company_id IS NULL"))
    except Exception:
        pass
    _rbac_columns = [
        "ALTER TABLE users ADD COLUMN plant_code VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN assigned_machine_id INTEGER REFERENCES machines(id)",
        "ALTER TABLE work_orders ADD COLUMN assigned_user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE work_orders ADD COLUMN plant_code VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN plant_code VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN machine_type VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN production_line VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN work_center VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN manufacturer VARCHAR(255)",
        "ALTER TABLE machines ADD COLUMN model_name VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN serial_number VARCHAR(128)",
        "ALTER TABLE machines ADD COLUMN purchase_date DATE",
        "ALTER TABLE machines ADD COLUMN warranty_until DATE",
        "ALTER TABLE machines ADD COLUMN assigned_operator VARCHAR(255)",
        "ALTER TABLE machines ADD COLUMN current_shift VARCHAR(64)",
        "ALTER TABLE machines ADD COLUMN health_score NUMERIC(5,2)",
        "ALTER TABLE machines ADD COLUMN efficiency_pct NUMERIC(5,2)",
        "ALTER TABLE machines ADD COLUMN oee_pct NUMERIC(5,2)",
        "ALTER TABLE machines ADD COLUMN temperature_c NUMERIC(6,2)",
        "ALTER TABLE machines ADD COLUMN rpm NUMERIC(8,2)",
        "ALTER TABLE machines ADD COLUMN last_maintenance_date DATE",
        "ALTER TABLE machines ADD COLUMN next_maintenance_date DATE",
        "ALTER TABLE daily_production_reports ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)",
    ]
    for ddl in _rbac_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _production_order_columns = [
        "ALTER TABLE production_orders ADD COLUMN customer_name VARCHAR(255)",
        "ALTER TABLE production_orders ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'",
        "ALTER TABLE production_orders ADD COLUMN bom_version VARCHAR(64)",
        "ALTER TABLE production_orders ADD COLUMN sales_order_number VARCHAR(64)",
        "ALTER TABLE production_orders ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE production_orders ADD COLUMN shift VARCHAR(64)",
        "ALTER TABLE work_orders ADD COLUMN priority VARCHAR(16) NOT NULL DEFAULT 'medium'",
        "ALTER TABLE work_orders ADD COLUMN shift VARCHAR(64)",
        "ALTER TABLE work_orders ADD COLUMN department VARCHAR(128)",
        "ALTER TABLE work_orders ADD COLUMN supervisor VARCHAR(255)",
        "ALTER TABLE work_orders ADD COLUMN materials_issued BOOLEAN NOT NULL DEFAULT 0",
        "ALTER TABLE production_orders ADD COLUMN sales_order_id INTEGER REFERENCES sales_orders(id)",
        "ALTER TABLE purchase_orders ADD COLUMN material_request_id INTEGER REFERENCES material_requests(id)",
        "ALTER TABLE tenants ADD COLUMN email VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN phone VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN address TEXT",
        "ALTER TABLE tenants ADD COLUMN subscription VARCHAR(50) DEFAULT 'trial'",
        "ALTER TABLE tenants ADD COLUMN trial_status BOOLEAN DEFAULT 1",
        "ALTER TABLE tenants ADD COLUMN company_code VARCHAR(32)",
        "ALTER TABLE tenants ADD COLUMN city VARCHAR(128)",
        "ALTER TABLE tenants ADD COLUMN state VARCHAR(128)",
        "ALTER TABLE tenants ADD COLUMN country VARCHAR(128)",
        "ALTER TABLE tenants ADD COLUMN pin_code VARCHAR(16)",
        "ALTER TABLE tenants ADD COLUMN gst_number VARCHAR(64)",
        "ALTER TABLE tenants ADD COLUMN status VARCHAR(32) DEFAULT 'active'",
        "ALTER TABLE tenants ADD COLUMN trial_days INTEGER DEFAULT 5",
        "ALTER TABLE tenants ADD COLUMN trial_expires_at DATETIME",
        "ALTER TABLE tenants ADD COLUMN license_status VARCHAR(32) DEFAULT 'active'",
        "ALTER TABLE users ADD COLUMN employee_id VARCHAR(64)",
        "ALTER TABLE users ADD COLUMN designation VARCHAR(128)",
        "ALTER TABLE users ADD COLUMN last_login_at DATETIME",
        "ALTER TABLE otp_challenges ADD COLUMN invalidated BOOLEAN DEFAULT 0",
        "ALTER TABLE otp_challenges ADD COLUMN purpose VARCHAR(32) DEFAULT 'super_admin_login'",
        "ALTER TABLE otp_challenges ADD COLUMN last_sent_at DATETIME",
        "ALTER TABLE alerts ADD COLUMN assigned_to VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN acknowledged_by VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN acknowledged_at DATETIME",
        "ALTER TABLE alerts ADD COLUMN reference_type VARCHAR(64)",
        "ALTER TABLE alerts ADD COLUMN reference_id INTEGER",
        "ALTER TABLE alerts ADD COLUMN module VARCHAR(64)",
        "ALTER TABLE alerts ADD COLUMN link VARCHAR(512)",
        "ALTER TABLE alerts ADD COLUMN target_role VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN metadata_json TEXT",
        "ALTER TABLE alerts ADD COLUMN created_by VARCHAR(255)",
        "ALTER TABLE alerts ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0",
    ]
    for ddl in _production_order_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    _document_columns = [
        "ALTER TABLE documents ADD COLUMN file_name VARCHAR(255)",
        "ALTER TABLE documents ADD COLUMN file_size INTEGER DEFAULT 0",
        "ALTER TABLE documents ADD COLUMN reference_type VARCHAR(64)",
        "ALTER TABLE documents ADD COLUMN reference_id INTEGER",
        "ALTER TABLE documents ADD COLUMN department VARCHAR(128) DEFAULT 'Procurement'",
        "ALTER TABLE documents ADD COLUMN version VARCHAR(32) DEFAULT 'v1.0'",
        "ALTER TABLE documents ADD COLUMN description TEXT",
        "ALTER TABLE documents ADD COLUMN uploaded_by VARCHAR(255)",
    ]
    for ddl in _document_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(ddl))
        except Exception:
            pass
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET email_verified = 1 WHERE email_verified = 0"))
    except Exception:
        pass
    from app.core.database import SessionLocal
    from app.core.seed_dashboard import seed_dashboard_data
    from app.core.seed_hr import seed_hr_data
    from app.core.seed_notifications import seed_notifications
    from app.core.seed_products import seed_products
    from app.core.seed_roles import seed_roles
    from app.core.seed_super_admin import seed_super_admin
    from app.core.seed_tenant import seed_tenant

    db = SessionLocal()
    try:
        seed_tenant(db)  # Ensure tenant 1 exists
        seed_super_admin(db)  # GNS Super Admin from .env
        seed_roles(db)  # Seeds default roles for tenant 1
        seed_products(db)  # Seeds sample products for tenant 1
        seed_notifications(db)  # Demo bell notifications per user
        seed_hr_data(db)  # Seeds sample employees, shifts & attendance
        seed_dashboard_data(db)  # Seeds machines & 7-day production reports
    except Exception:
        logger.exception("Seed warning during startup")
    finally:
        db.close()


app.include_router(settings_api_router)
app.include_router(notifications_api_router)
app.include_router(operator_api_router)
app.include_router(dashboard_api_router)
app.include_router(masters_api_router)
app.include_router(production_api_router)
app.include_router(ai_assistant_router)
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")
app.include_router(login_history_router)
app.include_router(login_history_router, prefix="/api")
app.include_router(audit_api_router, prefix="/api")
app.include_router(platform_router)
app.include_router(rbac_api_router)
# /api aliases for auth RBAC catalog (users, roles, permissions, sidebar, profile)
app.include_router(rbac_api_router, prefix="/api")

# ERP domain modules (Sales, Finance, Procurement, Quality, Maintenance, Analytics, HR, Inventory)
app.include_router(sales_router)
app.include_router(accounts_router)
app.include_router(procurement_router)
app.include_router(quality_router)
app.include_router(maintenance_router)
app.include_router(analytics_router)
app.include_router(hr_router)
app.include_router(inventory_router)
app.include_router(alerts_router)
app.include_router(alerts_router, prefix="/api")
app.include_router(admin_router)
app.include_router(company_settings_router)
app.include_router(documents_router)
app.include_router(documents_router, prefix="/api")
app.include_router(dispatch_router)
app.include_router(factory_monitor_router)
app.include_router(forecasting_router)
app.include_router(integration_router)
app.include_router(iot_router)
app.include_router(production_scheduling_router)
app.include_router(supply_chain_router)
app.include_router(task_management_router)
app.include_router(task_management_router, prefix="/api")
app.include_router(audit_logs_router)
app.include_router(warehouse_router)