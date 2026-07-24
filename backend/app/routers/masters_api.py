"""Masters API — Products, BOM, Machines (sidebar: Masters section)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.user import User
from app.routers.operator_deps import deny_delete_for_operator, require_tenant
from app.schemas.machine import MachineCreateExtended, MachineFullUpdate
from app.schemas.product import BomItemCreate, ProductCreate, ProductUpdate
from app.schemas.production import MachineCreate, MachineStatusEventCreate, MachineUpdate
from app.services.machine_service import get_machine_summary
from app.services.masters_service import MastersService
from app.services.production_service import (
    create_machine as _create_machine_svc,
    create_machine_status_event,
    list_machine_status_events,
    update_machine_status,
)
from app.utils.api_response import success_response

router = APIRouter(prefix="/api/masters", tags=["Masters API"])


def _svc(db: Session, tenant_id: int) -> MastersService:
    return MastersService(db, tenant_id)


def _dump(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, list):
        return [_dump(x) for x in obj]
    return jsonable_encoder(obj)


# ── Products ───────────────────────────────────────────────────────────────


@router.get("/products")
def list_products(user_tenant: tuple[User, int] = Depends(require_tenant("products")), db: Session = Depends(get_db)):
    _, tenant_id = user_tenant
    return success_response("Products retrieved", _svc(db, tenant_id).list_products())


@router.get("/products/{product_id}")
def get_product(
    product_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    data = _svc(db, tenant_id).get_product(product_id)
    if not data:
        raise HTTPException(404, "Product not found")
    return success_response("Product retrieved", data)


@router.post("/products")
def create_product(
    payload: ProductCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    return success_response("Product created", _svc(db, tenant_id).create_product(payload))


@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    data = _svc(db, tenant_id).update_product(product_id, payload)
    if not data:
        raise HTTPException(404, "Product not found")
    return success_response("Product updated", data)


@router.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("products")),
    _no_operator: User = Depends(deny_delete_for_operator),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    if not _svc(db, tenant_id).delete_product(product_id):
        raise HTTPException(404, "Product not found")
    return success_response("Product deleted", {"id": product_id})


# ── BOM ────────────────────────────────────────────────────────────────────


@router.get("/bom")
def list_bom(user_tenant: tuple[User, int] = Depends(require_tenant("bom")), db: Session = Depends(get_db)):
    _, tenant_id = user_tenant
    return success_response("BOM retrieved", _svc(db, tenant_id).list_all_bom())


@router.get("/bom/product/{product_id}")
def bom_for_product(
    product_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("bom")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    return success_response("Product BOM retrieved", _svc(db, tenant_id).list_bom_for_product(product_id))


@router.post("/bom")
def add_bom_line(
    payload: BomItemCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("bom")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    return success_response("BOM line added", _svc(db, tenant_id).add_bom_line(payload))


@router.delete("/bom/{bom_id}")
def delete_bom_line(
    bom_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("bom")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    if not _svc(db, tenant_id).delete_bom_line(bom_id):
        raise HTTPException(404, "BOM line not found")
    return success_response("BOM line deleted", {"id": bom_id})


# ── Machines ───────────────────────────────────────────────────────────────


@router.get("/machines")
def list_machines(user_tenant: tuple[User, int] = Depends(require_tenant("machines")), db: Session = Depends(get_db)):
    _, tenant_id = user_tenant
    return success_response("Machines retrieved", _svc(db, tenant_id).list_machines())


@router.get("/machines/summary")
def machine_summary(user_tenant: tuple[User, int] = Depends(require_tenant("machines")), db: Session = Depends(get_db)):
    user, tenant_id = user_tenant
    return success_response("Machine summary retrieved", _dump(get_machine_summary(db, tenant_id, user=user)))


@router.get("/machines/{machine_id}")
def get_machine(
    machine_id: int,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    data = _svc(db, tenant_id).get_machine(machine_id)
    if not data:
        raise HTTPException(404, "Machine not found")
    return success_response("Machine retrieved", data)


@router.post("/machines")
def create_machine(
    payload: MachineCreateExtended,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    return success_response("Machine created", _svc(db, tenant_id).create_machine(payload))


@router.put("/machines/{machine_id}")
def update_machine(
    machine_id: int,
    payload: MachineFullUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    data = _svc(db, tenant_id).update_machine(machine_id, payload)
    if not data:
        raise HTTPException(404, "Machine not found")
    return success_response("Machine updated", data)


@router.post("/machines/simple")
def create_machine_simple(
    payload: MachineCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    payload.tenant_id = tenant_id
    machine = _create_machine_svc(db, payload)
    return success_response("Machine created", _dump(machine))


@router.patch("/machines/{machine_id}/status")
def update_machine_status_endpoint(
    machine_id: int,
    payload: MachineUpdate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    user, tenant_id = user_tenant
    machine = update_machine_status(db, machine_id, tenant_id, payload.status, user=user)
    if not machine:
        raise HTTPException(404, "Machine not found")
    return success_response("Machine status updated", _dump(machine))


# ── Machine Status Events ──────────────────────────────────────────────────


@router.post("/machine-status")
def create_machine_status_event_endpoint(
    payload: MachineStatusEventCreate,
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    payload.tenant_id = tenant_id
    event = create_machine_status_event(db, payload)
    return success_response("Machine status event created", _dump(event))


@router.get("/machine-status")
def list_machine_status_events_endpoint(
    machine_id: int | None = Query(None),
    user_tenant: tuple[User, int] = Depends(require_tenant("machines")),
    db: Session = Depends(get_db),
):
    _, tenant_id = user_tenant
    return success_response(
        "Machine status events retrieved",
        _dump(list_machine_status_events(db, tenant_id, machine_id)),
    )
