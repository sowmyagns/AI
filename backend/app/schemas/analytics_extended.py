"""Analytics extended schemas — production, inventory, sales, finance, executive."""

from pydantic import BaseModel


class KpiItem(BaseModel):
    key: str
    label: str
    value: float | int | str
    change_pct: float | None = None
    unit: str | None = None
    format: str = "number"  # number | currency | percent
    drill_target: str | None = None


class ChartPoint(BaseModel):
    label: str
    value: float = 0
    value2: float | None = None
    value3: float | None = None


class AlertItem(BaseModel):
    type: str
    severity: str = "info"  # info | warning | success | danger
    message: str
    benchmark: str | None = None


class BenchmarkItem(BaseModel):
    label: str
    target: float
    current: float
    industry: float


class AiInsight(BaseModel):
    type: str
    message: str
    confidence: float | None = None


class ProductionAnalyticsRead(BaseModel):
    kpis: list[KpiItem]
    alerts: list[AlertItem]
    benchmarks: list[BenchmarkItem]
    monthly_production: list[ChartPoint]
    production_trend: list[ChartPoint]
    daily_output: list[ChartPoint]
    shift_wise: list[ChartPoint]
    machine_wise: list[ChartPoint]
    product_wise: list[ChartPoint]
    operator_performance: list[ChartPoint]
    downtime_analysis: list[ChartPoint]
    worker_score: float = 75.0
    last_updated: str


class InventoryAnalyticsRead(BaseModel):
    kpis: list[KpiItem]
    alerts: list[AlertItem]
    stock_in_vs_out: list[ChartPoint]
    warehouse_occupancy: list[ChartPoint]
    abc_analysis: list[ChartPoint]
    inventory_aging: list[ChartPoint]
    monthly_consumption: list[ChartPoint]
    value_trend: list[ChartPoint]
    fast_moving: list[dict]
    slow_moving: list[dict]
    dead_stock: list[dict]
    reorder_alerts: list[dict]
    last_updated: str


class SalesAnalyticsRead(BaseModel):
    kpis: list[KpiItem]
    alerts: list[AlertItem]
    monthly_revenue: list[ChartPoint]
    top_customers: list[ChartPoint]
    top_products: list[ChartPoint]
    regional_sales: list[ChartPoint]
    sales_funnel: list[ChartPoint]
    quotation_conversion: list[ChartPoint]
    order_status: list[ChartPoint]
    drill_revenue: list[dict]
    last_updated: str


class FinanceAnalyticsRead(BaseModel):
    kpis: list[KpiItem]
    alerts: list[AlertItem]
    revenue_vs_expense: list[ChartPoint]
    cash_flow: list[ChartPoint]
    profit_trend: list[ChartPoint]
    expense_category: list[ChartPoint]
    receivable_aging: list[ChartPoint]
    monthly_margin: list[ChartPoint]
    drill_revenue: list[dict]
    last_updated: str


class ExecutiveHubRead(BaseModel):
    kpis: list[KpiItem]
    alerts: list[AlertItem]
    benchmarks: list[BenchmarkItem]
    revenue_trend: list[ChartPoint]
    production_trend: list[ChartPoint]
    inventory_value_trend: list[ChartPoint]
    machine_health: list[ChartPoint]
    quality_pass_rate: float = 0
    ai_insights: list[AiInsight]
    last_updated: str


class LiveDashboardRead(BaseModel):
    current_production: float
    active_machines: int
    total_machines: int
    todays_orders: int
    dispatches_today: int
    breakdown_alerts: int
    live_oee: float
    alerts: list[AlertItem]
    ai_insights: list[AiInsight]
    production_pulse: list[ChartPoint]
    last_updated: str
