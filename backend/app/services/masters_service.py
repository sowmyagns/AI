"""Masters module — Products, BOM, Machines business logic."""

from sqlalchemy.orm import Session

from app.repositories.bom_repository import BomRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.machine import MachineCreateExtended, MachineFullUpdate
from app.schemas.product import BomItemCreate, ProductCreate, ProductUpdate
from app.services.machine_service import create_machine_extended, get_machine_detail, list_machines_enriched, update_machine_full
from app.services.product_service import (
    add_bom_item,
    create_product,
    delete_bom_item,
    delete_product,
    get_product,
    list_bom,
    list_products,
    update_product,
)


class MastersService:
    def __init__(self, db: Session, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id
        self.products = ProductRepository(db, tenant_id)
        self.bom = BomRepository(db, tenant_id)
        self.machines = MachineRepository(db, tenant_id)

    # ── Products ───────────────────────────────────────────────────────────

    def list_products(self) -> list[dict]:
        return [
            {
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "description": p.description,
                "unit_cost": float(p.unit_cost) if p.unit_cost else None,
                "unit_price": float(p.unit_price) if p.unit_price else None,
                "min_stock": int(p.min_stock) if p.min_stock is not None else None,
                "max_stock": int(p.max_stock) if p.max_stock is not None else None,
                "current_stock": int(p.current_stock) if p.current_stock is not None else 0,
            }
            for p in list_products(self.db, self.tenant_id)
        ]

    def get_product(self, product_id: int) -> dict | None:
        p = get_product(self.db, self.tenant_id, product_id)
        if not p:
            return None
        return {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "unit_cost": float(p.unit_cost) if p.unit_cost else None,
            "unit_price": float(p.unit_price) if p.unit_price else None,
            "min_stock": int(p.min_stock) if p.min_stock is not None else None,
            "max_stock": int(p.max_stock) if p.max_stock is not None else None,
            "current_stock": int(p.current_stock) if p.current_stock is not None else 0,
            "bom": [self.bom.enrich_item(b) for b in list_bom(self.db, self.tenant_id, p.id)],
        }

    def create_product(self, payload: ProductCreate) -> dict:
        payload.tenant_id = self.tenant_id
        p = create_product(self.db, payload)
        return {"id": p.id, "sku": p.sku, "name": p.name}

    def update_product(self, product_id: int, payload: ProductUpdate) -> dict | None:
        p = update_product(self.db, self.tenant_id, product_id, payload)
        if not p:
            return None
        return {"id": p.id, "sku": p.sku, "name": p.name}

    def delete_product(self, product_id: int) -> bool:
        return delete_product(self.db, self.tenant_id, product_id)

    # ── BOM ────────────────────────────────────────────────────────────────

    def list_all_bom(self) -> list[dict]:
        return [self.bom.enrich_item(item) for item in self.bom.list_all()]

    def list_bom_for_product(self, product_id: int) -> list[dict]:
        return [self.bom.enrich_item(item) for item in list_bom(self.db, self.tenant_id, product_id)]

    def add_bom_line(self, payload: BomItemCreate) -> dict:
        payload.tenant_id = self.tenant_id
        item = add_bom_item(self.db, payload)
        return self.bom.enrich_item(item)

    def delete_bom_line(self, bom_id: int) -> bool:
        return delete_bom_item(self.db, self.tenant_id, bom_id)

    # ── Machines ───────────────────────────────────────────────────────────

    def list_machines(self) -> list[dict]:
        enriched = list_machines_enriched(self.db, self.tenant_id)
        return [m.model_dump(mode="json") for m in enriched]

    def get_machine(self, machine_id: int) -> dict | None:
        detail = get_machine_detail(self.db, self.tenant_id, machine_id)
        return detail.model_dump(mode="json") if detail else None

    def create_machine(self, payload: MachineCreateExtended) -> dict:
        payload.tenant_id = self.tenant_id
        m = create_machine_extended(self.db, payload)
        return {"id": m.id, "code": m.code, "name": m.name, "status": m.status}

    def update_machine(self, machine_id: int, payload: MachineFullUpdate) -> dict | None:
        m = update_machine_full(self.db, self.tenant_id, machine_id, payload)
        if not m:
            return None
        return {"id": m.id, "code": m.code, "name": m.name, "status": m.status}
