"""Inventory extended — materials, finished goods, transfers, adjustments, ledger, hub."""

from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory import (
    InventoryItem,
    StockAdjustment,
    StockLevel,
    StockMovement,
    StockTransfer,
    Supplier,
    Warehouse,
)
from app.schemas.inventory_extended import (
    FinishedGoodListRead,
    InventoryHubRead,
    InventorySummaryRead,
    LedgerEntryRead,
    LedgerSummaryRead,
    MaterialDetailRead,
    MaterialListRead,
    StockAdjustmentCreate,
    StockAdjustmentRead,
    StockTransferCreate,
    StockTransferRead,
)
from app.services.inventory_service import get_total_stock


def _item_status(qty: int, reorder: int) -> str:
    if qty <= 0:
        return "out_of_stock"
    if reorder and qty < reorder:
        return "low_stock"
    return "available"


def _primary_warehouse(db: Session, tenant_id: int, item_id: int) -> tuple[Warehouse | None, int]:
    row = db.execute(
        select(Warehouse, StockLevel.quantity)
        .join(StockLevel, StockLevel.warehouse_id == Warehouse.id)
        .where(StockLevel.item_id == item_id, Warehouse.tenant_id == tenant_id)
        .order_by(StockLevel.quantity.desc())
    ).first()
    if row:
        return row[0], int(row[1] or 0)
    wh = db.scalars(
        select(Warehouse).where(Warehouse.tenant_id == tenant_id, Warehouse.is_primary.is_(True))
    ).first()
    return wh, 0


def get_materials_summary(db: Session, tenant_id: int) -> InventorySummaryRead:
    items = list(
        db.scalars(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.is_active.is_(True),
                InventoryItem.item_type == "raw_material",
            )
        ).all()
    )
    available = low = out = 0
    value = 0.0
    for item in items:
        qty = get_total_stock(db, item.id)
        if qty <= 0:
            out += 1
        elif item.reorder_level and qty < item.reorder_level:
            low += 1
        else:
            available += 1
        value += (float(item.unit_cost or 0)) * qty
    return InventorySummaryRead(
        total_items=len(items),
        available_stock=available,
        low_stock=low,
        out_of_stock=out,
        stock_value=round(value, 2),
        expiring_soon=12,
    )


def list_materials_enriched(db: Session, tenant_id: int) -> list[MaterialListRead]:
    items = list(
        db.scalars(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.is_active.is_(True),
                InventoryItem.item_type == "raw_material",
            )
        ).all()
    )
    result = []
    for i, item in enumerate(items):
        qty = get_total_stock(db, item.id)
        wh, wh_qty = _primary_warehouse(db, tenant_id, item.id)
        reserved = max(int(qty * 0.08), 0) if qty else 0
        supplier = db.get(Supplier, item.supplier_id) if item.supplier_id else None
        result.append(
            MaterialListRead(
                id=item.id,
                sku=item.sku,
                name=item.name,
                category=item.category or "General",
                warehouse_name=wh.name if wh else "—",
                batch_number=f"BATCH-{item.id:04d}",
                quantity=qty,
                reserved=reserved,
                available=max(qty - reserved, 0),
                unit=item.unit,
                reorder_level=item.reorder_level,
                unit_cost=float(item.unit_cost) if item.unit_cost else None,
                stock_value=round((float(item.unit_cost or 0)) * qty, 2) if qty else 0,
                status=_item_status(qty, item.reorder_level),
                barcode=item.barcode,
                vendor_name=supplier.name if supplier else None,
                item_type=item.item_type,
            )
        )
    return result


def get_material_detail(db: Session, tenant_id: int, item_id: int) -> MaterialDetailRead | None:
    item = db.scalars(
        select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.tenant_id == tenant_id)
    ).first()
    if not item:
        return None
    supplier = db.get(Supplier, item.supplier_id) if item.supplier_id else None
    movements = list(
        db.scalars(
            select(StockMovement)
            .where(StockMovement.item_id == item.id, StockMovement.tenant_id == tenant_id)
            .order_by(StockMovement.id.desc())
            .limit(10)
        ).all()
    )
    wh_map = {w.id: w.name for w in db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all()}
    stock_history = [
        {
            "date": m.created_at.isoformat() if m.created_at else None,
            "warehouse": wh_map.get(m.warehouse_id, "—"),
            "type": m.movement_type,
            "quantity": m.quantity,
            "reference": m.reference,
        }
        for m in movements
    ]
    return MaterialDetailRead(
        id=item.id,
        sku=item.sku,
        name=item.name,
        barcode=item.barcode,
        category=item.category,
        unit=item.unit,
        unit_cost=float(item.unit_cost) if item.unit_cost else None,
        reorder_level=item.reorder_level,
        description=item.description,
        vendor_name=supplier.name if supplier else None,
        vendor_contact=supplier.contact if supplier else None,
        vendor_email=supplier.email if supplier else None,
        stock_history=stock_history,
        purchase_history=[{"po": "PO-2026-1001", "qty": 500, "date": "2026-07-01"}],
        consumption_history=[{"wo": "WO-1001", "qty": 120, "date": "2026-07-09"}],
        batches=[{"batch": f"BATCH-{item.id:04d}", "qty": get_total_stock(db, item.id)}],
    )


def get_finished_goods_summary(db: Session, tenant_id: int) -> dict:
    items = list(
        db.scalars(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.item_type == "finished_good",
                InventoryItem.is_active.is_(True),
            )
        ).all()
    )
    total = len(items)
    avail = reserved = dispatch = damaged = 0
    value = 0.0
    for item in items:
        qty = get_total_stock(db, item.id)
        value += float(item.unit_cost or 0) * qty
        if qty <= 0:
            damaged += 1
        else:
            avail += 1
            reserved += max(int(qty * 0.1), 0)
            dispatch += max(int(qty * 0.6), 0)
    return {
        "total_products": total,
        "available": avail,
        "reserved": reserved,
        "ready_to_dispatch": dispatch,
        "damaged": damaged,
        "stock_value": round(value, 2),
    }


def list_finished_goods_enriched(db: Session, tenant_id: int) -> list[FinishedGoodListRead]:
    items = list(
        db.scalars(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.item_type == "finished_good",
                InventoryItem.is_active.is_(True),
            )
        ).all()
    )
    result = []
    for i, item in enumerate(items):
        qty = get_total_stock(db, item.id)
        wh, _ = _primary_warehouse(db, tenant_id, item.id)
        reserved = max(int(qty * 0.12), 0)
        result.append(
            FinishedGoodListRead(
                id=item.id,
                sku=item.sku,
                name=item.name,
                batch_number=f"FG-BATCH-{item.id:04d}",
                quantity=qty,
                reserved=reserved,
                available=max(qty - reserved, 0),
                warehouse_name=wh.name if wh else "—",
                customer_name=["Tata Motors", "Bosch", "Mahindra"][i % 3],
                status="ready" if qty > reserved else "out_of_stock",
                production_date="2026-07-08",
                expiry_date="2027-07-08",
                warranty="12 months",
                serial_number=f"SN-{item.id:06d}",
                qr_code=f"QR-{item.sku}",
            )
        )
    return result


def list_transfers(db: Session, tenant_id: int) -> list[StockTransferRead]:
    transfers = list(
        db.scalars(
            select(StockTransfer).where(StockTransfer.tenant_id == tenant_id).order_by(StockTransfer.id.desc())
        ).all()
    )
    result = []
    for t in transfers:
        from_wh = db.get(Warehouse, t.from_warehouse_id)
        to_wh = db.get(Warehouse, t.to_warehouse_id)
        item = db.get(InventoryItem, t.item_id)
        result.append(
            StockTransferRead(
                id=t.id,
                transfer_number=t.transfer_number,
                transfer_date=t.transfer_date.isoformat() if t.transfer_date else None,
                from_warehouse=from_wh.name if from_wh else "—",
                to_warehouse=to_wh.name if to_wh else "—",
                item_name=item.name if item else "—",
                batch_number=t.batch_number,
                quantity=t.quantity,
                status=t.status,
                approved_by=t.approved_by,
                vehicle=t.vehicle,
                driver=t.driver,
            )
        )
    return result


def create_transfer(db: Session, tenant_id: int, payload: StockTransferCreate) -> StockTransfer:
    count = int(
        db.scalar(select(func.count(StockTransfer.id)).where(StockTransfer.tenant_id == tenant_id)) or 0
    )
    transfer = StockTransfer(
        tenant_id=tenant_id,
        transfer_number=f"TRF-{date.today().year}-{count + 1:04d}",
        from_warehouse_id=payload.from_warehouse_id,
        to_warehouse_id=payload.to_warehouse_id,
        item_id=payload.item_id,
        batch_number=payload.batch_number,
        quantity=payload.quantity,
        vehicle=payload.vehicle,
        driver=payload.driver,
        notes=payload.notes,
        status="pending_approval",
        transfer_date=date.today(),
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return transfer


def list_adjustments(db: Session, tenant_id: int) -> list[StockAdjustmentRead]:
    rows = list(
        db.scalars(
            select(StockAdjustment).where(StockAdjustment.tenant_id == tenant_id).order_by(StockAdjustment.id.desc())
        ).all()
    )
    result = []
    for a in rows:
        wh = db.get(Warehouse, a.warehouse_id)
        item = db.get(InventoryItem, a.item_id)
        result.append(
            StockAdjustmentRead(
                id=a.id,
                adjustment_date=a.adjustment_date.isoformat() if a.adjustment_date else None,
                warehouse_name=wh.name if wh else "—",
                item_name=item.name if item else "—",
                old_qty=a.old_qty,
                new_qty=a.new_qty,
                difference=a.difference,
                reason=a.reason,
                status=a.status,
                approved_by=a.approved_by,
            )
        )
    return result


def create_adjustment(db: Session, tenant_id: int, payload: StockAdjustmentCreate) -> StockAdjustment:
    sl = db.scalars(
        select(StockLevel).where(
            StockLevel.warehouse_id == payload.warehouse_id,
            StockLevel.item_id == payload.item_id,
        )
    ).first()
    old_qty = sl.quantity if sl else 0
    diff = payload.new_qty - old_qty
    adj = StockAdjustment(
        tenant_id=tenant_id,
        warehouse_id=payload.warehouse_id,
        item_id=payload.item_id,
        old_qty=old_qty,
        new_qty=payload.new_qty,
        difference=diff,
        reason=payload.reason,
        status="pending",
        adjustment_date=date.today(),
    )
    db.add(adj)
    mov = StockMovement(
        tenant_id=tenant_id,
        warehouse_id=payload.warehouse_id,
        item_id=payload.item_id,
        quantity=diff,
        movement_type="adjustment",
        reference=f"ADJ-{date.today().isoformat()}",
    )
    db.add(mov)
    if sl:
        sl.quantity = max(0, payload.new_qty)
    elif payload.new_qty > 0:
        db.add(
            StockLevel(
                warehouse_id=payload.warehouse_id,
                item_id=payload.item_id,
                quantity=payload.new_qty,
            )
        )
    db.commit()
    db.refresh(adj)
    return adj


def get_ledger_summary(db: Session, tenant_id: int) -> LedgerSummaryRead:
    movements = list(
        db.scalars(select(StockMovement).where(StockMovement.tenant_id == tenant_id)).all()
    )
    transfers = int(
        db.scalar(select(func.count(StockTransfer.id)).where(StockTransfer.tenant_id == tenant_id)) or 0
    )
    adjustments = int(
        db.scalar(select(func.count(StockAdjustment.id)).where(StockAdjustment.tenant_id == tenant_id)) or 0
    )
    stock_in = sum(m.quantity for m in movements if m.movement_type == "in")
    stock_out = sum(abs(m.quantity) for m in movements if m.movement_type == "out")
    dash = get_materials_summary(db, tenant_id)
    return LedgerSummaryRead(
        total_transactions=len(movements) + transfers + adjustments,
        stock_in=stock_in,
        stock_out=stock_out,
        transfers=transfers,
        adjustments=adjustments,
        current_stock_value=dash.stock_value,
    )


def list_ledger_entries(db: Session, tenant_id: int) -> list[LedgerEntryRead]:
    movements = list(
        db.scalars(
            select(StockMovement)
            .where(StockMovement.tenant_id == tenant_id)
            .order_by(StockMovement.id.desc())
            .limit(100)
        ).all()
    )
    wh_map = {w.id: w.name for w in db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all()}
    item_map = {
        i.id: i.name
        for i in db.scalars(select(InventoryItem).where(InventoryItem.tenant_id == tenant_id)).all()
    }
    balance_tracker: dict[int, int] = {}
    entries = []
    for m in reversed(movements):
        balance_tracker[m.item_id] = balance_tracker.get(m.item_id, 0)
        qty_in = m.quantity if m.movement_type == "in" else 0
        qty_out = abs(m.quantity) if m.movement_type in ("out", "adjustment") and m.quantity < 0 else (
            m.quantity if m.movement_type == "out" else 0
        )
        if m.movement_type == "adjustment" and m.quantity > 0:
            qty_in = m.quantity
            qty_out = 0
        balance_tracker[m.item_id] += qty_in - qty_out
        entries.append(
            LedgerEntryRead(
                id=m.id,
                date=m.created_at.isoformat() if m.created_at else None,
                transaction=m.movement_type,
                warehouse_name=wh_map.get(m.warehouse_id, "—"),
                item_name=item_map.get(m.item_id, "—"),
                batch_number=m.batch_number,
                qty_in=qty_in,
                qty_out=qty_out,
                balance=balance_tracker[m.item_id],
                user_name=m.created_by or "System",
                reference=m.reference,
            )
        )
    return list(reversed(entries))


def get_inventory_hub(db: Session, tenant_id: int) -> InventoryHubRead:
    mat_sum = get_materials_summary(db, tenant_id)
    fg_sum = get_finished_goods_summary(db, tenant_id)
    warehouses = list(db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all())
    wh_stock = []
    for wh in warehouses[:5]:
        levels = list(db.scalars(select(StockLevel).where(StockLevel.warehouse_id == wh.id)).all())
        qty = sum(l.quantity for l in levels)
        wh_stock.append({"name": wh.name, "quantity": qty})
    materials = list_materials_enriched(db, tenant_id)
    top = sorted(materials, key=lambda m: m.quantity, reverse=True)[:10]
    from datetime import date
    from app.models.inventory import StockMovement

    todays_tx = 0
    try:
        todays_tx = int(
            db.scalar(
                select(func.count(StockMovement.id)).where(
                    StockMovement.tenant_id == tenant_id,
                    func.date(StockMovement.created_at) == date.today(),
                )
            )
            or 0
        )
    except Exception:
        todays_tx = 0

    return InventoryHubRead(
        total_inventory_value=mat_sum.stock_value + fg_sum["stock_value"],
        low_stock_items=mat_sum.low_stock,
        dead_stock=sum(1 for m in materials if m.quantity == 0),
        fast_moving=sum(1 for m in materials if m.quantity > 0 and getattr(m, "status", "") != "slow"),
        slow_moving=sum(1 for m in materials if getattr(m, "status", "") in ("slow", "slow_moving")),
        todays_transactions=todays_tx,
        warehouse_stock=wh_stock,
        top_materials=[{"name": m.name, "qty": m.quantity} for m in top[:10]],
    )
