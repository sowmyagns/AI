"""Main ERP dashboard — live KPIs from production data."""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.machine import Machine
from app.models.production import DailyProductionReport, ProductionOrder, WorkOrder
from app.models.inventory import InventoryItem, StockLevel, StockMovement, Warehouse
from app.models.sales import Invoice, SalesOrder
from app.models.user import User
from app.services.notification_management_service import get_user_notifications
from app.services.shop_floor_service import get_shop_floor_summary


def _trend_pct(current: float, previous: float) -> tuple[float, bool]:
    if previous <= 0:
        return 0.0, True
    pct = round((current - previous) / previous * 100, 1)
    return abs(pct), pct >= 0


def _machine_status_breakdown(machines: list[Machine]) -> list[dict]:
    buckets = {
        "running": ("Running", "#22C55E", ("running", "active")),
        "idle": ("Idle", "#3B82F6", ("idle", "stopped", "offline")),
        "setup": ("Setup", "#F97316", ("setup", "changeover")),
        "maintenance": ("Maintenance", "#EF4444", ("maintenance",)),
        "breakdown": ("Breakdown", "#991B1B", ("breakdown", "down", "fault")),
    }
    counts = {key: 0 for key in buckets}
    for machine in machines:
        status = (machine.status or "idle").lower()
        matched = False
        for key, (_, _, statuses) in buckets.items():
            if status in statuses:
                counts[key] += 1
                matched = True
                break
        if not matched:
            counts["idle"] += 1
    if not machines:
        return [
            {"name": label, "value": 0, "color": color}
            for key, (label, color, _) in buckets.items()
        ]
    return [
        {"name": label, "value": counts[key], "color": color}
        for key, (label, color, _) in buckets.items()
    ]


def _top_machines(machines: list[Machine], limit: int = 5) -> list[dict]:
    ranked = sorted(
        machines,
        key=lambda m: float(m.efficiency_pct or m.oee_pct or 0),
        reverse=True,
    )
    if not ranked:
        return []
    result = []
    for machine in ranked[:limit]:
        util = float(machine.efficiency_pct or machine.oee_pct or 0)
        result.append({
            "id": machine.code or f"M-{machine.id}",
            "name": machine.name,
            "utilization": round(util, 1),
        })
    return result


def _production_overview(db: Session, tenant_id: int, days: int) -> list[dict]:
    today = date.today()
    overview = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        day_reports = list(
            db.scalars(
                select(DailyProductionReport).where(
                    DailyProductionReport.tenant_id == tenant_id,
                    DailyProductionReport.report_date == d,
                )
            ).all()
        )
        actual = int(sum(float(r.produced_quantity or 0) for r in day_reports))
        planned = int(sum(float(r.planned_quantity or 0) for r in day_reports))
        overview.append({
            "date": d.strftime("%d %b"),
            "planned": planned,
            "actual": actual,
        })
    return overview


def _weekly_overview(db: Session, tenant_id: int) -> list[dict]:
    today = date.today()
    rows = []
    for week in range(5, 0, -1):
        start = today - timedelta(days=week * 7)
        end = start + timedelta(days=6)
        reports = list(
            db.scalars(
                select(DailyProductionReport).where(
                    DailyProductionReport.tenant_id == tenant_id,
                    DailyProductionReport.report_date >= start,
                    DailyProductionReport.report_date <= end,
                )
            ).all()
        )
        actual = int(sum(float(r.produced_quantity or 0) for r in reports))
        planned = int(sum(float(r.planned_quantity or 0) for r in reports))
        rows.append({
            "date": f"Week {6 - week}",
            "planned": planned,
            "actual": actual,
        })
    return rows


def _monthly_overview(db: Session, tenant_id: int) -> list[dict]:
    today = date.today()
    rows = []
    for month_offset in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=month_offset * 28)).replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(day=31)
        else:
            month_end = (month_start.replace(month=month_start.month + 1, day=1) - timedelta(days=1))
        reports = list(
            db.scalars(
                select(DailyProductionReport).where(
                    DailyProductionReport.tenant_id == tenant_id,
                    DailyProductionReport.report_date >= month_start,
                    DailyProductionReport.report_date <= month_end,
                )
            ).all()
        )
        actual = int(sum(float(r.produced_quantity or 0) for r in reports))
        planned = int(sum(float(r.planned_quantity or 0) for r in reports))
        rows.append({
            "date": month_start.strftime("%b"),
            "planned": planned,
            "actual": actual,
        })
    return rows


def get_erp_dashboard(db: Session, tenant_id: int, user: User | None = None) -> dict:
    today = date.today()
    yesterday = today - timedelta(days=1)

    total_orders = int(
        db.scalar(
            select(func.count(ProductionOrder.id)).where(ProductionOrder.tenant_id == tenant_id)
        ) or 0
    )
    pending_orders = int(
        db.scalar(
            select(func.count(WorkOrder.id)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("planned", "pending", "released", "material_ready", "in_progress", "running")),
            )
        ) or 0
    )

    today_reports = list(
        db.scalars(
            select(DailyProductionReport).where(
                DailyProductionReport.tenant_id == tenant_id,
                DailyProductionReport.report_date == today,
            )
        ).all()
    )
    yesterday_reports = list(
        db.scalars(
            select(DailyProductionReport).where(
                DailyProductionReport.tenant_id == tenant_id,
                DailyProductionReport.report_date == yesterday,
            )
        ).all()
    )

    today_production = int(sum(float(r.produced_quantity or 0) for r in today_reports))
    yesterday_production = int(sum(float(r.produced_quantity or 0) for r in yesterday_reports))
    # Fallback: sum actual_quantity from today's completed/running work orders
    if today_production == 0:
        wo_actual = db.scalar(
            select(func.sum(WorkOrder.actual_quantity)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("completed", "in_progress", "running", "done")),
            )
        )
        today_production = int(wo_actual or 0)
    good_qty = today_production
    reject_qty = int(sum(float(r.scrap_quantity or 0) for r in today_reports))

    machines = list(db.scalars(select(Machine).where(Machine.tenant_id == tenant_id)).all())
    total_machines = len(machines)
    running_machines = sum(1 for m in machines if m.status in ("running", "active"))

    completed_orders = int(
        db.scalar(
            select(func.count(WorkOrder.id)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("completed", "closed", "done")),
            )
        ) or 0
    )
    on_hold_orders = int(
        db.scalar(
            select(func.count(WorkOrder.id)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("on_hold", "paused", "hold")),
            )
        ) or 0
    )
    in_progress_orders = int(
        db.scalar(
            select(func.count(WorkOrder.id)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("in_progress", "running")),
            )
        ) or 0
    )

    prod_trend, prod_up = _trend_pct(today_production, yesterday_production)
    good_trend, good_up = prod_trend, prod_up
    yesterday_reject = int(sum(float(r.scrap_quantity or 0) for r in yesterday_reports))
    reject_trend, reject_up = _trend_pct(reject_qty, yesterday_reject)

    shop = get_shop_floor_summary(db, tenant_id)
    overview = _production_overview(db, tenant_id, 7)

    # Inventory blocks for dashboard (real stock only)
    items = list(db.scalars(select(InventoryItem).where(InventoryItem.tenant_id == tenant_id)).all())
    levels = list(db.scalars(select(StockLevel)).all())
    level_by_item: dict[int, float] = {}
    for sl in levels:
        level_by_item[sl.item_id] = level_by_item.get(sl.item_id, 0) + float(sl.quantity or 0)

    raw_qty = fg_qty = wip_qty = 0.0
    raw_value = fg_value = 0.0
    low_stock = 0
    for item in items:
        qty = level_by_item.get(item.id, 0)
        cost = float(item.unit_cost or 0) * qty
        itype = (getattr(item, "item_type", None) or getattr(item, "category", None) or "").lower()
        if "finish" in itype or itype in ("fg", "finished_good", "finished"):
            fg_qty += qty
            fg_value += cost
        elif "wip" in itype:
            wip_qty += qty
        else:
            raw_qty += qty
            raw_value += cost
        reorder = int(getattr(item, "reorder_level", 0) or 0)
        if reorder and qty <= reorder:
            low_stock += 1

    warehouses = list(db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all())
    warehouse_locations = []
    for wh in warehouses[:8]:
        wh_levels = [sl for sl in levels if sl.warehouse_id == wh.id]
        warehouse_locations.append({
            "id": wh.id,
            "name": wh.name,
            "code": getattr(wh, "code", None),
            "quantity": sum(float(sl.quantity or 0) for sl in wh_levels),
        })

    inventory_blocks = [
        {"key": "raw", "label": "Raw Materials", "quantity": int(raw_qty), "value": round(raw_value, 2)},
        {"key": "wip", "label": "WIP", "quantity": int(wip_qty), "value": 0},
        {"key": "fg", "label": "Finished Goods", "quantity": int(fg_qty), "value": round(fg_value, 2)},
        {"key": "low_stock", "label": "Low Stock Items", "quantity": low_stock, "value": 0},
    ]

    so_today = int(
        db.scalar(
            select(func.count(SalesOrder.id)).where(
                SalesOrder.tenant_id == tenant_id,
                SalesOrder.order_date == today,
            )
        )
        or 0
    )
    shipped_today = int(
        db.scalar(
            select(func.count(SalesOrder.id)).where(
                SalesOrder.tenant_id == tenant_id,
                SalesOrder.shipped.is_(True),
                SalesOrder.order_date == today,
            )
        )
        or 0
    )
    inv_today = int(
        db.scalar(
            select(func.count(Invoice.id)).where(
                Invoice.tenant_id == tenant_id,
                Invoice.issue_date == today,
            )
        )
        or 0
    )
    stock_moves_today = 0
    try:
        stock_moves_today = int(
            db.scalar(
                select(func.count(StockMovement.id)).where(
                    StockMovement.tenant_id == tenant_id,
                    func.date(StockMovement.created_at) == today,
                )
            )
            or 0
        )
    except Exception:
        stock_moves_today = int(
            db.scalar(
                select(func.count(StockMovement.id)).where(
                    StockMovement.tenant_id == tenant_id
                )
            )
            or 0
        )

    todays_summary = [
        {"label": "Production output", "value": today_production, "unit": "pcs"},
        {"label": "Work orders active", "value": in_progress_orders, "unit": ""},
        {"label": "Sales orders today", "value": so_today, "unit": ""},
        {"label": "Shipments (SO date)", "value": shipped_today, "unit": ""},
        {"label": "Invoices issued", "value": inv_today, "unit": ""},
        {"label": "Stock movements", "value": stock_moves_today, "unit": ""},
        {"label": "Rejects / scrap", "value": reject_qty, "unit": "pcs"},
        {"label": "Machines running", "value": running_machines, "unit": f"/ {total_machines}"},
    ]

    production_orders = list(
        db.scalars(
            select(ProductionOrder)
            .where(ProductionOrder.tenant_id == tenant_id)
            .order_by(ProductionOrder.id.desc())
            .limit(5)
        ).all()
    )
    recent_orders = [
        {
            "id": o.id,
            "order_number": o.order_number,
            "status": o.status,
            "planned_quantity": float(o.planned_quantity),
            "customer_name": o.customer_name,
        }
        for o in production_orders
    ]

    work_orders = list(
        db.scalars(
            select(WorkOrder)
            .where(WorkOrder.tenant_id == tenant_id)
            .order_by(WorkOrder.id.desc())
            .limit(5)
        ).all()
    )
    recent_work_orders = []
    for wo in work_orders:
        product_name = "—"
        if wo.production_order and wo.production_order.product:
            product_name = wo.production_order.product.name
        recent_work_orders.append({
            "wo": wo.work_order_number,
            "product": product_name,
            "qty": float(wo.planned_quantity or 0),
            "status": wo.status,
            "due": wo.planned_end.isoformat() if wo.planned_end else None,
        })

    notifications = get_user_notifications(db, user) if user else {"notifications": []}
    alerts_feed = [
        {
            "id": n.get("id"),
            "message": n.get("title") or n.get("message"),
            "time": n.get("triggered_at"),
            "color": "#EF4444" if n.get("severity") == "high" else "#3B82F6",
            "icon": "alert",
        }
        for n in notifications.get("notifications", [])[:5]
    ]

    total_wo = total_orders or (completed_orders + in_progress_orders + on_hold_orders + pending_orders)
    progress_pct = round((completed_orders / total_wo) * 100) if total_wo else 0
    machine_pct = round(running_machines / total_machines * 100) if total_machines else 0

    return {
        "kpi_cards": [
            {
                "id": "total-orders",
                "title": "Total Orders",
                "value": str(total_orders),
                "trend": "0%",
                "trendUp": True,
                "trendLabel": "vs last 7 days",
                "link": "/production/planning",
            },
            {
                "id": "today-production",
                "title": "Today's Production",
                "value": str(today_production or shop.todays_production or 0),
                "unit": "Pcs",
                "trend": f"{prod_trend}%",
                "trendUp": prod_up,
                "trendLabel": "vs yesterday",
                "link": "/production/reports",
            },
            {
                "id": "machines-running",
                "title": "Machines Running",
                "value": str(running_machines),
                "suffix": f"/ {total_machines}",
                "trend": f"{machine_pct}%",
                "trendUp": True,
                "trendLabel": "vs total machines",
                "link": "/production/machines",
            },
            {
                "id": "pending-orders",
                "title": "Pending Orders",
                "value": str(pending_orders),
                "trend": "0%",
                "trendUp": False,
                "trendLabel": "vs last 7 days",
                "link": "/production/work-orders",
            },
            {
                "id": "good-qty",
                "title": "Good Qty (Today)",
                "value": str(good_qty),
                "unit": "Pcs",
                "trend": f"{good_trend}%",
                "trendUp": good_up,
                "trendLabel": "vs yesterday",
                "link": "/production/reports",
            },
            {
                "id": "reject-qty",
                "title": "Reject Qty (Today)",
                "value": str(reject_qty),
                "unit": "Pcs",
                "trend": f"{reject_trend}%",
                "trendUp": not reject_up,
                "trendLabel": "vs yesterday",
                "link": "/production/reports",
            },
        ],
        "production_overview": overview,
        "production_overview_weekly": _weekly_overview(db, tenant_id),
        "production_overview_monthly": _monthly_overview(db, tenant_id),
        "shop_floor_status": _machine_status_breakdown(machines),
        "top_machines": _top_machines(machines),
        "orders_overview": {
            "total": total_wo,
            "inProgress": in_progress_orders,
            "completed": completed_orders,
            "onHold": on_hold_orders,
            "progress": progress_pct,
        },
        "alerts_feed": alerts_feed,
        "recent_work_orders": recent_work_orders,
        "shop_floor": {
            "running_jobs": shop.running_jobs,
            "active_machines": shop.active_machines,
            "operators_working": shop.operators_working,
            "todays_production": shop.todays_production,
            "todays_target": shop.todays_target,
            "oee_pct": shop.oee_pct,
        },
        "recent_production_orders": recent_orders,
        "inventory_blocks": inventory_blocks,
        "warehouse_locations": warehouse_locations,
        "todays_summary": todays_summary,
        "date": today.isoformat(),
    }
