"""Analytics extended — production, inventory, sales, finance, executive, live."""

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.schemas.analytics_extended import (
    AiInsight,
    AlertItem,
    BenchmarkItem,
    ChartPoint,
    ExecutiveHubRead,
    FinanceAnalyticsRead,
    InventoryAnalyticsRead,
    KpiItem,
    LiveDashboardRead,
    ProductionAnalyticsRead,
    SalesAnalyticsRead,
)
from app.services.analytics_service import (
    get_inventory_turnover_rate,
    get_machine_efficiency,
    get_monthly_production_trend,
    get_profit_analysis,
    get_worker_performance_score,
)


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _months_short() -> list[str]:
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _kpi(key: str, label: str, value, change_pct=None, unit=None, fmt="number", drill=None) -> KpiItem:
    return KpiItem(key=key, label=label, value=value, change_pct=change_pct, unit=unit, format=fmt, drill_target=drill)


def get_production_analytics(db: Session, tenant_id: int, year: int | None = None) -> ProductionAnalyticsRead:
    from sqlalchemy import func, select

    from app.models.production import DailyProductionReport, WorkOrder
    from app.models.quality import QualityInspection

    y = year or date.today().year
    trend = get_monthly_production_trend(db, tenant_id, y)
    machine = get_machine_efficiency(db, tenant_id)
    worker = get_worker_performance_score(db, tenant_id)

    total_out = sum(m["value"] for m in trend)
    planned_qty = float(
        db.scalar(
            select(func.sum(WorkOrder.planned_quantity)).where(WorkOrder.tenant_id == tenant_id)
        )
        or 0
    )
    actual_qty = float(
        db.scalar(
            select(func.sum(WorkOrder.actual_quantity)).where(WorkOrder.tenant_id == tenant_id)
        )
        or 0
    )
    planned = int(planned_qty) if planned_qty else int(total_out)
    actual = int(actual_qty) if actual_qty else int(total_out)
    efficiency = round(actual / planned * 100, 1) if planned else 0.0
    oee = float(machine.get("overall_percent") or 0)
    total_m = max(1, int(machine.get("total_machines") or 0) or 1)
    util = round((int(machine.get("running") or 0) / total_m) * 100, 1) if machine.get("total_machines") else 0.0

    insp = list(
        db.scalars(select(QualityInspection).where(QualityInspection.tenant_id == tenant_id)).all()
    )
    insp_total = len(insp) or 0
    failed = sum(1 for i in insp if i.result in ("fail", "failed"))
    rejection = round(failed / insp_total * 100, 1) if insp_total else 0.0

    completed = int(
        db.scalar(
            select(func.count(WorkOrder.id)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("completed", "closed", "done")),
            )
        )
        or 0
    )
    wip = int(
        db.scalar(
            select(func.count(WorkOrder.id)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("in_progress", "running", "material_ready")),
            )
        )
        or 0
    )

    kpis = [
        _kpi("planned", "Planned Production", planned, None, "units", "number", "monthly"),
        _kpi("actual", "Actual Production", actual, None, "units", "number", "monthly"),
        _kpi("efficiency", "Production Efficiency", efficiency, None, "%", "percent", "machine"),
        _kpi("oee", "OEE", oee, None, "%", "percent", "machine"),
        _kpi("utilization", "Machine Utilization", util, None, "%", "percent", "machine"),
        _kpi("rejection", "Rejection %", rejection, None, "%", "percent", "quality"),
        _kpi("downtime", "Downtime Hours", 0, None, "h", "number", "downtime"),
        _kpi("cost", "Production Cost", 0, None, None, "currency", "cost"),
        _kpi("wip", "WIP", wip, None, "units", "number", "wip"),
        _kpi("completed", "Completed Orders", completed, None, None, "number", "orders"),
        _kpi("worker", "Worker Performance", worker.get("average_score", 0), None, "%", "percent", "operator"),
        _kpi("avg_month", "Avg / Month", round(actual / 12) if actual else 0, None, "units", "number", "monthly"),
    ]

    monthly = [
        ChartPoint(label=m["month"], value=m["value"], value2=None) for m in trend
    ]
    machines = []
    if machine.get("by_machine"):
        machines = [
            ChartPoint(label=f"Machine {m['machine_id']}", value=m["efficiency"])
            for m in machine["by_machine"][:6]
        ]

    alerts = []
    if planned and efficiency < 90:
        alerts.append(
            AlertItem(
                type="target",
                severity="warning",
                message=f"Production efficiency at {efficiency}% of plan",
                benchmark="Target 100%",
            )
        )
    if int(machine.get("down") or 0) > 0:
        alerts.append(
            AlertItem(
                type="downtime",
                severity="danger",
                message=f"{machine.get('down')} machine(s) down / in maintenance",
            )
        )

    return ProductionAnalyticsRead(
        kpis=kpis,
        alerts=alerts,
        benchmarks=[
            BenchmarkItem(label="Target Production", target=100, current=efficiency, industry=0),
            BenchmarkItem(label="OEE", target=85, current=oee, industry=0),
            BenchmarkItem(label="Machine Utilization", target=90, current=util, industry=0),
        ],
        monthly_production=monthly,
        production_trend=monthly,
        daily_output=[],
        shift_wise=[],
        machine_wise=machines,
        product_wise=[],
        operator_performance=[],
        downtime_analysis=[],
        worker_score=worker.get("average_score", 0),
        last_updated=_now_iso(),
    )


def get_inventory_analytics(db: Session, tenant_id: int) -> InventoryAnalyticsRead:
    from sqlalchemy import select

    from app.models.inventory import InventoryItem, StockLevel, Warehouse
    from app.services.inventory_extended_service import get_materials_summary, get_finished_goods_summary

    turnover = get_inventory_turnover_rate(db, tenant_id)
    rate = float(turnover.get("rate") or 0)
    outflow = float(turnover.get("total_out_movements") or 0)
    avg_inv = float(turnover.get("average_inventory") or 0)

    mat = get_materials_summary(db, tenant_id)
    fg = get_finished_goods_summary(db, tenant_id)
    inv_value = float(mat.stock_value or 0) + float(fg.get("stock_value") or 0)

    items = list(db.scalars(select(InventoryItem).where(InventoryItem.tenant_id == tenant_id)).all())
    levels = {
        sl.item_id: float(sl.quantity or 0)
        for sl in db.scalars(select(StockLevel)).all()
    }
    reorder_alerts = []
    dead = []
    for item in items:
        qty = levels.get(item.id, 0)
        reorder = int(getattr(item, "reorder_level", 0) or 0)
        if reorder and qty <= reorder:
            reorder_alerts.append(
                {"item": item.name, "current": qty, "reorder": reorder, "warehouse": "—"}
            )
        if qty == 0:
            dead.append({"item": item.name, "qty": 0, "value": 0})

    warehouses = list(db.scalars(select(Warehouse).where(Warehouse.tenant_id == tenant_id)).all())
    occupancy = []
    for wh in warehouses[:6]:
        wh_qty = sum(
            float(sl.quantity or 0)
            for sl in db.scalars(select(StockLevel).where(StockLevel.warehouse_id == wh.id)).all()
        )
        occupancy.append(ChartPoint(label=wh.name, value=wh_qty))

    kpis = [
        _kpi("turnover", "Turnover Rate", rate, None, "x", "number", "turnover"),
        _kpi("outflow", "Outflow", outflow, None, "units", "number", "outflow"),
        _kpi("avg_inv", "Average Inventory", avg_inv, None, "units", "number", "avg"),
        _kpi("value", "Inventory Value", inv_value, None, None, "currency", "value"),
        _kpi("fast", "Stocked Items", sum(1 for i in items if levels.get(i.id, 0) > 0), None, None, "number", "fast"),
        _kpi("slow", "Slow Moving Items", 0, None, None, "number", "slow"),
        _kpi("dead", "Dead Stock", len(dead), None, None, "number", "dead"),
        _kpi("reorder", "Reorder Alerts", len(reorder_alerts), None, None, "number", "reorder"),
        _kpi("accuracy", "Stock Accuracy", 100 if items else 0, None, "%", "percent", "accuracy"),
        _kpi("warehouse", "Warehouses", len(warehouses), None, None, "number", "warehouse"),
    ]

    alerts = []
    if reorder_alerts:
        alerts.append(
            AlertItem(
                type="reorder",
                severity="danger",
                message=f"{len(reorder_alerts)} items at or below reorder level",
            )
        )
    if dead:
        alerts.append(
            AlertItem(type="dead", severity="warning", message=f"{len(dead)} items with zero stock")
        )

    return InventoryAnalyticsRead(
        kpis=kpis,
        alerts=alerts,
        stock_in_vs_out=[],
        warehouse_occupancy=occupancy,
        abc_analysis=[],
        inventory_aging=[],
        monthly_consumption=[],
        value_trend=[],
        fast_moving=[],
        slow_moving=[],
        dead_stock=dead[:10],
        reorder_alerts=reorder_alerts[:10],
        last_updated=_now_iso(),
    )


def get_sales_analytics(db: Session, tenant_id: int, year: int | None = None) -> SalesAnalyticsRead:
    y = year or date.today().year
    try:
        from app.services.sales_extended_service import get_sales_hub, get_so_summary
        hub = get_sales_hub(db, tenant_id)
        so = get_so_summary(db, tenant_id)
        revenue = hub.monthly_revenue or so.revenue
        orders = hub.total_orders or so.total_orders
        pending = hub.pending_orders or so.pending
        customers = hub.new_customers
        top_cust = hub.top_customers or []
    except Exception:
        revenue, orders, pending, customers = 0, 0, 0, 0
        top_cust = []

    aov = round(revenue / max(1, orders)) if orders else 0
    dispatch_perf = 0.0
    try:
        from app.services.sales_extended_service import get_dispatch_summary

        dsum = get_dispatch_summary(db, tenant_id)
        shipped = dsum.in_transit + dsum.delivered
        total_d = dsum.ready_to_dispatch + dsum.packed + shipped
        dispatch_perf = round(shipped / total_d * 100, 1) if total_d else 0.0
    except Exception:
        pass

    kpis = [
        _kpi("revenue", "Revenue", revenue, None, None, "currency", "month"),
        _kpi("orders", "Orders", orders, None, None, "number", "orders"),
        _kpi("customers", "Customers", customers, None, None, "number", "customer"),
        _kpi("conversion", "Conversion Rate", 0, None, "%", "percent", "funnel"),
        _kpi("aov", "Average Order Value", aov, None, None, "currency", "orders"),
        _kpi("growth", "Sales Growth", 0, None, "%", "percent", "month"),
        _kpi("pending", "Pending Orders", pending, None, None, "number", "orders"),
        _kpi("dispatch", "Dispatch Performance", dispatch_perf, None, "%", "percent", "dispatch"),
    ]

    months = _months_short()
    monthly_rev = [ChartPoint(label=m, value=0) for m in months]
    top_customers = [
        ChartPoint(label=c.get("name", f"C{i+1}"), value=c.get("orders", 0))
        for i, c in enumerate(top_cust[:5])
    ]

    return SalesAnalyticsRead(
        kpis=kpis,
        alerts=[],
        monthly_revenue=monthly_rev,
        top_customers=top_customers,
        top_products=[],
        regional_sales=[],
        sales_funnel=[],
        quotation_conversion=[],
        order_status=[],
        drill_revenue=[],
        last_updated=_now_iso(),
    )


def get_finance_analytics(db: Session, tenant_id: int, year: int | None = None) -> FinanceAnalyticsRead:
    from sqlalchemy import select

    y = year or date.today().year
    profit = get_profit_analysis(db, tenant_id, y) or {}
    receivables = payables = 0.0
    cash_flow_data: list = []
    profit_trend_data: list = []
    aging = {"0-30": 0.0, "31-60": 0.0, "61-90": 0.0, "90+": 0.0}
    try:
        from app.services.finance_extended_service import get_ar_summary, get_ap_summary, get_finance_hub

        ar = get_ar_summary(db, tenant_id)
        ap = get_ap_summary(db, tenant_id)
        hub = get_finance_hub(db, tenant_id)
        receivables = float(ar.total_receivables or 0)
        payables = float(ap.outstanding_payables or 0)
        cash_flow_data = hub.cash_flow_trend or []
        profit_trend_data = hub.profit_trend or []
        aging = {
            "0-30": float(ar.aging_0_30 or 0),
            "31-60": float(ar.aging_31_60 or 0),
            "61-90": float(ar.aging_61_90 or 0),
            "90+": float(ar.aging_90_plus or 0),
        }
    except Exception:
        pass

    revenue = float(profit.get("total_revenue") or 0)
    expense = float(profit.get("total_expense") or 0)
    net = float(profit["total_profit"]) if profit.get("total_profit") is not None else (revenue - expense)
    margin = float(profit.get("overall_margin_percent") or 0)
    if not margin and revenue:
        margin = round(net / revenue * 100, 1)

    gst = 0.0
    try:
        from app.models.sales import Invoice

        invs = list(db.scalars(select(Invoice).where(Invoice.tenant_id == tenant_id)).all())
        gst = sum(
            float(i.sgst_amount or 0) + float(i.cgst_amount or 0) + float(i.igst_amount or 0)
            for i in invs
        )
    except Exception:
        pass

    cash_net = 0.0
    if cash_flow_data:
        last = cash_flow_data[-1]
        cash_net = float(last.get("inflow", 0) or 0) - float(last.get("outflow", 0) or 0)
    working_capital = receivables - payables

    kpis = [
        _kpi("revenue", "Revenue", revenue, None, None, "currency", "month"),
        _kpi("expenses", "Expenses", expense, None, None, "currency", "expense"),
        _kpi("profit", "Net Profit", net, None, None, "currency", "profit"),
        _kpi("margin", "Margin", margin, None, "%", "percent", "margin"),
        _kpi("cashflow", "Cash Flow", cash_net, None, None, "currency", "cashflow"),
        _kpi("receivables", "Outstanding Receivables", receivables, None, None, "currency", "receivables"),
        _kpi("payables", "Outstanding Payables", payables, None, None, "currency", "payables"),
        _kpi("gst", "GST Collected", gst, None, None, "currency", "gst"),
        _kpi("operating", "Operating Cost", expense, None, None, "currency", "expense"),
        _kpi("monthly_profit", "Monthly Profit", round(net / 12, 2) if net else 0, None, None, "currency", "profit"),
        _kpi("ebitda", "EBITDA", net, None, None, "currency", "profit"),
        _kpi("working_capital", "Working Capital", working_capital, None, None, "currency", "capital"),
    ]

    monthly = profit.get("monthly") or []
    rev_exp = [
        ChartPoint(label=m["month"], value=m.get("revenue", 0), value2=m.get("expense", 0))
        for m in monthly
    ]
    cash_flow = [
        ChartPoint(label=c["month"], value=c.get("inflow", 0), value2=c.get("outflow", 0))
        for c in cash_flow_data
    ]
    if profit_trend_data:
        profit_trend = [
            ChartPoint(label=p["month"], value=p.get("profit", p.get("amount", 0)))
            for p in profit_trend_data
        ]
    else:
        profit_trend = [ChartPoint(label=m["month"], value=m.get("profit", 0)) for m in monthly]

    expense_cat: list[ChartPoint] = []
    recv_aging = [
        ChartPoint(label="0-30 Days", value=aging["0-30"]),
        ChartPoint(label="31-60 Days", value=aging["31-60"]),
        ChartPoint(label="61-90 Days", value=aging["61-90"]),
        ChartPoint(label="90+ Days", value=aging["90+"]),
    ]
    monthly_margin = [ChartPoint(label=m["month"], value=m.get("margin_percent", 0)) for m in monthly]
    drill = [{"level": "year", "label": str(y), "value": revenue}]
    if monthly:
        best = max(monthly, key=lambda m: float(m.get("revenue") or 0))
        drill.append({"level": "month", "label": best.get("month", ""), "value": best.get("revenue", 0)})

    alerts: list[AlertItem] = []
    if payables > 0 and receivables < payables:
        alerts.append(
            AlertItem(
                type="cashflow",
                severity="warning",
                message="Payables exceed receivables — review cash position",
            )
        )
    if aging["90+"] > 0:
        alerts.append(
            AlertItem(
                type="receivables",
                severity="danger",
                message=f"₹{aging['90+']:,.0f} receivables aged 90+ days",
            )
        )

    return FinanceAnalyticsRead(
        kpis=kpis,
        alerts=alerts,
        revenue_vs_expense=rev_exp,
        cash_flow=cash_flow,
        profit_trend=profit_trend,
        expense_category=expense_cat,
        receivable_aging=recv_aging,
        monthly_margin=monthly_margin,
        drill_revenue=drill,
        last_updated=_now_iso(),
    )


def get_executive_hub(db: Session, tenant_id: int, year: int | None = None) -> ExecutiveHubRead:
    prod = get_production_analytics(db, tenant_id, year)
    inv = get_inventory_analytics(db, tenant_id)
    sales = get_sales_analytics(db, tenant_id, year)
    finance = get_finance_analytics(db, tenant_id, year)
    machine = get_machine_efficiency(db, tenant_id)

    rev_kpi = next((k for k in sales.kpis if k.key == "revenue"), None)
    profit_kpi = next((k for k in finance.kpis if k.key == "profit"), None)
    prod_kpi = next((k for k in prod.kpis if k.key == "actual"), None)
    inv_kpi = next((k for k in inv.kpis if k.key == "value"), None)

    kpis = [
        _kpi("revenue", "Revenue", rev_kpi.value if rev_kpi else 0, rev_kpi.change_pct if rev_kpi else None, None, "currency"),
        _kpi("profit", "Profit", profit_kpi.value if profit_kpi else 0, profit_kpi.change_pct if profit_kpi else None, None, "currency"),
        _kpi("production", "Production", prod_kpi.value if prod_kpi else 0, prod_kpi.change_pct if prod_kpi else None, "units", "number"),
        _kpi("inventory", "Inventory", inv_kpi.value if inv_kpi else 0, inv_kpi.change_pct if inv_kpi else None, None, "currency"),
        _kpi("machine_health", "Machine Health", machine.get("overall_percent", 0), None, "%", "percent"),
        _kpi("worker_eff", "Worker Efficiency", prod.worker_score or 0, None, "%", "percent"),
        _kpi("satisfaction", "Customer Satisfaction", 0, None, "/5", "number"),
        _kpi(
            "pending_orders",
            "Pending Orders",
            next((k.value for k in sales.kpis if k.key == "pending"), 0),
            None,
            None,
            "number",
        ),
        _kpi(
            "quality",
            "Quality Pass Rate",
            next((k.value for k in prod.kpis if k.key == "efficiency"), 0),
            None,
            "%",
            "percent",
        ),
    ]

    all_alerts = (sales.alerts + finance.alerts + prod.alerts + inv.alerts)[:6]

    return ExecutiveHubRead(
        kpis=kpis,
        alerts=all_alerts,
        benchmarks=prod.benchmarks,
        revenue_trend=sales.monthly_revenue,
        production_trend=prod.production_trend,
        inventory_value_trend=inv.value_trend,
        machine_health=prod.machine_wise,
        quality_pass_rate=float(next((k.value for k in prod.kpis if k.key == "efficiency"), 0) or 0),
        ai_insights=[],
        last_updated=_now_iso(),
    )


def get_live_dashboard(db: Session, tenant_id: int) -> LiveDashboardRead:
    from sqlalchemy import func, select

    from app.models.sales import SalesOrder
    from app.models.production import WorkOrder

    machine = get_machine_efficiency(db, tenant_id)
    prod = get_production_analytics(db, tenant_id)
    today = date.today()

    todays_orders = int(
        db.scalar(
            select(func.count(SalesOrder.id)).where(
                SalesOrder.tenant_id == tenant_id,
                SalesOrder.order_date == today,
            )
        )
        or 0
    )
    dispatches_today = int(
        db.scalar(
            select(func.count(SalesOrder.id)).where(
                SalesOrder.tenant_id == tenant_id,
                SalesOrder.shipped.is_(True),
                SalesOrder.order_date == today,
            )
        )
        or 0
    )
    current_production = int(
        db.scalar(
            select(func.sum(WorkOrder.actual_quantity)).where(
                WorkOrder.tenant_id == tenant_id,
                WorkOrder.status.in_(("in_progress", "running", "completed")),
            )
        )
        or 0
    )
    actual_kpi = next((k for k in prod.kpis if k.key == "actual"), None)
    if actual_kpi and actual_kpi.value:
        current_production = int(actual_kpi.value)

    alerts = []
    down = int(machine.get("down") or 0)
    if down:
        alerts.append(
            AlertItem(
                type="breakdown",
                severity="danger",
                message=f"{down} machine(s) down or in maintenance",
            )
        )
    if dispatches_today:
        alerts.append(
            AlertItem(
                type="dispatch",
                severity="info",
                message=f"{dispatches_today} shipments linked to today's orders",
            )
        )

    return LiveDashboardRead(
        current_production=current_production,
        active_machines=int(machine.get("running") or 0),
        total_machines=int(machine.get("total_machines") or 0),
        todays_orders=todays_orders,
        dispatches_today=dispatches_today,
        breakdown_alerts=down,
        live_oee=float(machine.get("overall_percent") or 0),
        alerts=alerts,
        ai_insights=[],
        production_pulse=[],
        last_updated=_now_iso(),
    )
