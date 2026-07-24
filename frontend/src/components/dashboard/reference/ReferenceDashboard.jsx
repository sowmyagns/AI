import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Package,
  Plus,
  ShoppingCart,
  Target,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import EmptyChart from "../../common/EmptyChart";
import { quickActionsRef } from "../../../data/referenceDashboardData";
import { getErpDashboard } from "../../../api/dashboardApi";
import useAuth from "../../../hooks/useAuth";
import useManufacturingRefresh from "../../../hooks/useManufacturingRefresh";
import { userCanAccess, isOperator } from "../../../config/permissions";
import { CardShell, KpiIcon, StatusBadge, TrendBadge } from "./ReferenceParts";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  fontSize: 12,
};

const KPI_TITLE_KEYS = {
  "total-orders": "totalOrders",
  "today-production": "todaysProduction",
  "machines-running": "machinesRunning",
  "pending-orders": "pendingOrders",
  "good-qty": "goodQtyToday",
  "reject-qty": "rejectQtyToday",
};

const TREND_LABEL_KEYS = {
  "vs last 7 days": "vsLast7Days",
  "vs yesterday": "vsYesterday",
  "vs total machines": "vsTotalMachines",
};

const SHOP_FLOOR_KEYS = {
  Running: "running",
  Idle: "idle",
  Setup: "setup",
  Maintenance: "maintenance",
  Breakdown: "breakdown",
};

const INVENTORY_KEYS = ["rawMaterials", "wipItems", "finishedGoods", "lowStockItems"];
const WAREHOUSE_KEYS = ["mainStore", "productionStore", "fgStore", "others"];
const QUICK_ACTION_KEYS = ["newWorkOrder", "productionEntry", "materialIssue", "stockTransfer", "qcEntry", "reports"];
const QUICK_ACTION_MODULES = ["production", "production", "inventory", "inventory", "quality", "analytics"];
const SUMMARY_KEYS = ["manPower", "workingHours", "powerConsumption", "productionEfficiency", "targetAchievement"];

const KPI_STYLE = {
  "total-orders": { gradient: "from-blue-600 to-blue-500", iconBg: "bg-white/20" },
  "today-production": { gradient: "from-emerald-600 to-emerald-500", iconBg: "bg-white/20" },
  "machines-running": { gradient: "from-violet-600 to-violet-500", iconBg: "bg-white/20" },
  "pending-orders": { gradient: "from-orange-600 to-orange-500", iconBg: "bg-white/20" },
  "good-qty": { gradient: "from-teal-600 to-teal-500", iconBg: "bg-white/20" },
  "reject-qty": { gradient: "from-red-600 to-red-500", iconBg: "bg-white/20" },
};

const EMPTY_ORDERS = { total: 0, inProgress: 0, completed: 0, onHold: 0, progress: 0 };
const PERIOD_KEYS = { Daily: "daily", Weekly: "weekly", Monthly: "monthly" };

const summaryIcons = { users: Users, clock: Clock, zap: Zap, gauge: Gauge, target: Target };
const alertIcons = { alert: AlertTriangle, wrench: Wrench, box: Package, check: CheckCircle2, cart: ShoppingCart };
const blockIcons = { boxes: Boxes, cog: Wrench, package: Package, alert: AlertTriangle };

function KpiStrip({ cards = [] }) {
  const { t } = useTranslation();
  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-500">
        {t("common.noData", "No data available.")}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => {
        const titleKey = KPI_TITLE_KEYS[card.id];
        const trendKey = TREND_LABEL_KEYS[card.trendLabel];
        const style = KPI_STYLE[card.id] || KPI_STYLE["total-orders"];
        const cls = `relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.gradient} p-4 text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-transform hover:-translate-y-0.5 block`;
        const inner = (
          <div className="flex items-start gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}>
              <KpiIcon id={card.id} className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-white/85 leading-tight">
                {titleKey ? t(`refDashboard.${titleKey}`) : card.title}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums leading-none">
                {card.value}
                {card.unit && <span className="ml-1 text-sm font-semibold">{card.unit}</span>}
                {card.suffix && <span className="text-lg font-semibold text-white/80">{card.suffix}</span>}
              </p>
              <TrendBadge
                up={card.trendUp}
                value={card.trend}
                label={trendKey ? t(`refDashboard.${trendKey}`) : card.trendLabel}
              />
            </div>
          </div>
        );
        return card.link ? (
          <Link key={card.id} to={card.link} className={cls}>{inner}</Link>
        ) : (
          <div key={card.id} className={cls}>{inner}</div>
        );
      })}
    </div>
  );
}

function ProductionOverview({ chartSets }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState("Daily");
  const chartData = chartSets?.[period] ?? [];
  const hasChartData = chartData.length > 0;
  return (
    <CardShell
      title={t("refDashboard.productionOverview")}
      className="h-full"
      action={
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
          {Object.entries(PERIOD_KEYS).map(([label, key]) => (
            <button
              key={label}
              type="button"
              onClick={() => setPeriod(label)}
              className={`rounded-md px-2.5 py-1 transition-colors ${period === label ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500"}`}
            >
              {t(`refDashboard.${key}`)}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-[260px] w-full">
        {hasChartData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} key={period}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Line type="monotone" dataKey="planned" name={t("refDashboard.plannedQty")} stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, fill: "#3B82F6" }} />
              <Line type="monotone" dataKey="actual" name={t("refDashboard.actualQty")} stroke="#22C55E" strokeWidth={2.5} dot={{ r: 3, fill: "#22C55E" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message={t("common.noData", "No data available.")} />
        )}
      </div>
    </CardShell>
  );
}

function ShopFloorStatus({ statusData = [] }) {
  const { t } = useTranslation();
  const total = statusData.reduce((s, d) => s + d.value, 0);
  if (!statusData.length) {
    return (
      <CardShell title={t("refDashboard.shopFloorStatus")} className="h-full">
        <EmptyChart message={t("common.noData", "No data available.")} className="min-h-[180px]" />
      </CardShell>
    );
  }
  return (
    <CardShell title={t("refDashboard.shopFloorStatus")} className="h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={2}>
                {statusData.map((e) => (
                  <Cell key={e.name} fill={e.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-medium text-slate-500">{t("refDashboard.totalMachines")}</span>
            <span className="text-2xl font-bold text-[#1E293B]">{total}</span>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {statusData.map((item) => {
            const key = SHOP_FLOOR_KEYS[item.name];
            return (
              <li key={item.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{key ? t(`refDashboard.${key}`) : item.name}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-800">{item.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </CardShell>
  );
}

function TopMachines({ machines = [] }) {
  const { t } = useTranslation();
  if (!machines.length) {
    return (
      <CardShell title={t("refDashboard.topMachines")} className="h-full">
        <p className="py-8 text-center text-sm text-slate-500">{t("common.noData", "No data available.")}</p>
      </CardShell>
    );
  }
  return (
    <CardShell title={t("refDashboard.topMachines")} className="h-full">
      <ul className="space-y-3">
        {machines.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
              {m.id.split("-")[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-slate-700">{m.id}</span>
                <span className="font-bold text-[#2563EB]">{m.utilization}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#22C55E]" style={{ width: `${m.utilization}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

function OrdersOverview({ overview = EMPTY_ORDERS }) {
  const { t } = useTranslation();
  const stats = [
    { labelKey: "totalOrders", value: overview.total, color: "text-[#2563EB]" },
    { labelKey: "inProgress", value: overview.inProgress, color: "text-orange-500" },
    { labelKey: "completed", value: overview.completed, color: "text-green-600" },
    { labelKey: "onHold", value: overview.onHold, color: "text-red-500" },
  ];
  return (
    <CardShell title={t("refDashboard.ordersOverview")}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.labelKey} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-[10px] font-medium text-slate-500">{t(`refDashboard.${s.labelKey}`)}</p>
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{Number(s.value ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-medium text-slate-600">{t("refDashboard.overallProgress")}</span>
          <span className="font-bold text-[#2563EB]">{overview.progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]" style={{ width: `${overview.progress}%` }} />
        </div>
      </div>
    </CardShell>
  );
}

function InventorySummary({ blocks = [], warehouses = [] }) {
  const { t } = useTranslation();
  if (!blocks.length) {
    return (
      <CardShell title={t("refDashboard.inventorySummary")}>
        <p className="py-8 text-center text-sm text-slate-500">{t("common.noData", "No data available.")}</p>
      </CardShell>
    );
  }
  return (
    <CardShell title={t("refDashboard.inventorySummary")}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {blocks.map((b, i) => {
          const Icon = blockIcons[b.icon] || Boxes;
          const labelKey = INVENTORY_KEYS[i];
          return (
            <div key={b.label} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${b.color || "#2563EB"}18`, color: b.color || "#2563EB" }}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{Number(b.count ?? b.quantity ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {labelKey ? t(`refDashboard.${labelKey}`) : b.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mb-2 text-xs font-semibold text-slate-600">{t("refDashboard.warehouseLocation")}</p>
      <div className="flex h-3 overflow-hidden rounded-full">
        {warehouses.map((w, i) => (
          <div key={w.name} style={{ width: `${w.pct || 0}%`, backgroundColor: w.color || "#94A3B8" }} title={WAREHOUSE_KEYS[i] ? t(`refDashboard.${WAREHOUSE_KEYS[i]}`) : w.name} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {warehouses.map((w, i) => (
          <span key={w.name} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: w.color || "#94A3B8" }} />
            {WAREHOUSE_KEYS[i] ? t(`refDashboard.${WAREHOUSE_KEYS[i]}`) : w.name}
          </span>
        ))}
      </div>
    </CardShell>
  );
}

function AlertsNotifications({ alerts = [] }) {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("refDashboard.alertsNotifications")}
      action={<Link to="/alerts" className="text-xs font-semibold text-[#2563EB] hover:underline">{t("common.viewAll")}</Link>}
    >
      {!alerts.length ? (
        <p className="py-6 text-center text-sm text-slate-500">{t("common.noData", "No data available.")}</p>
      ) : (
        <ul className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {alerts.map((a, i) => {
            const Icon = alertIcons[a.icon] || AlertTriangle;
            const inner = (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${a.color}18`, color: a.color }}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">{a.message}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{a.time || "—"}</p>
                </div>
              </>
            );
            return (
              <li key={a.id || i}>
                {a.link ? (
                  <Link to={a.link} className="flex gap-3 rounded-lg p-1 -m-1 hover:bg-slate-50">{inner}</Link>
                ) : (
                  <div className="flex gap-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

function QuickActions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (isOperator(user)) return null;
  const visible = quickActionsRef.filter((_, i) => userCanAccess(user, QUICK_ACTION_MODULES[i]));
  if (!visible.length) return null;
  return (
    <CardShell title={t("refDashboard.quickActions")}>
      <div className="grid grid-cols-2 gap-3">
        {quickActionsRef.map((a, i) => {
          if (!userCanAccess(user, QUICK_ACTION_MODULES[i])) return null;
          const labelKey = QUICK_ACTION_KEYS[i];
          return (
            <Link
              key={a.label}
              to={a.to}
              className="flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              style={{ backgroundColor: a.bg }}
            >
              <Plus className="h-5 w-5" />
              <span className="text-[11px] font-semibold leading-tight">
                {labelKey ? t(`refDashboard.${labelKey}`) : a.label}
              </span>
            </Link>
          );
        })}
      </div>
    </CardShell>
  );
}

function RecentWorkOrders({ workOrders = [] }) {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("refDashboard.recentWorkOrders")}
      action={<Link to="/production/work-orders" className="text-xs font-semibold text-[#2563EB] hover:underline">{t("common.viewAll")}</Link>}
    >
      {!workOrders.length ? (
        <p className="py-6 text-center text-sm text-slate-500">{t("common.noRecords", "No records found.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-3 font-semibold">{t("refDashboard.woNo")}</th>
                <th className="pb-2 pr-3 font-semibold">{t("refDashboard.product")}</th>
                <th className="pb-2 pr-3 font-semibold">{t("refDashboard.qty")}</th>
                <th className="pb-2 pr-3 font-semibold">{t("refDashboard.status")}</th>
                <th className="pb-2 font-semibold">{t("refDashboard.dueDate")}</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <tr key={wo.wo} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 pr-3 font-semibold text-[#2563EB]">{wo.wo}</td>
                  <td className="py-2.5 pr-3 text-slate-700">{wo.product}</td>
                  <td className="py-2.5 pr-3 tabular-nums">{wo.qty}</td>
                  <td className="py-2.5 pr-3"><StatusBadge status={wo.status} /></td>
                  <td className="py-2.5 text-slate-500 text-xs">{wo.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
}

function TodaysSummary({ items = [] }) {
  const { t } = useTranslation();
  if (!items.length) {
    return (
      <CardShell title={t("refDashboard.todaysSummary")}>
        <p className="py-8 text-center text-sm text-slate-500">{t("common.noData", "No data available.")}</p>
      </CardShell>
    );
  }
  return (
    <CardShell title={t("refDashboard.todaysSummary")}>
      <ul className="space-y-3">
        {items.map((item, i) => {
          const Icon = summaryIcons[item.icon] || BarChart3;
          const labelKey = SUMMARY_KEYS[i];
          return (
            <li key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="flex items-center gap-2.5 text-sm text-slate-600">
                <Icon className="h-4 w-4 text-[#2563EB]" />
                {labelKey ? t(`refDashboard.${labelKey}`) : item.label}
              </span>
              <span className="text-sm font-bold text-slate-800">{item.value}</span>
            </li>
          );
        })}
      </ul>
    </CardShell>
  );
}

export default function ReferenceDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getErpDashboard()
      .then((res) => setApiData(res.data))
      .catch(() => {
        setApiData(null);
        setError("Failed to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  const kpiCardsLive = useMemo(() => {
    if (!apiData?.kpi_cards?.length) return [];
    return apiData.kpi_cards.map((k) => ({ ...k, value: k.value ?? "0" }));
  }, [apiData]);

  const chartSets = useMemo(() => {
    if (!apiData) return null;
    return {
      Daily: apiData.production_overview || [],
      Weekly: apiData.production_overview_weekly || [],
      Monthly: apiData.production_overview_monthly || [],
    };
  }, [apiData]);

  const alertsLive = useMemo(() => apiData?.alerts_feed || [], [apiData]);

  const workOrdersLive = useMemo(() => {
    if (!apiData?.recent_work_orders?.length) return [];
    return apiData.recent_work_orders.map((w) => ({
      wo: w.wo,
      product: w.product,
      qty: w.qty,
      status: w.status,
      due: w.due ? String(w.due).slice(0, 10) : "—",
    }));
  }, [apiData]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-500">{t("common.loading", "Loading...")}</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-sm text-red-700">
        {error}
        <button type="button" onClick={load} className="mt-4 text-[#2563EB] font-semibold hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <KpiStrip cards={kpiCardsLive} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <ProductionOverview chartSets={chartSets} />
        </div>
        <div className="xl:col-span-3">
          <ShopFloorStatus statusData={apiData?.shop_floor_status || []} />
        </div>
        <div className="xl:col-span-4">
          <TopMachines machines={apiData?.top_machines || []} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <OrdersOverview overview={{ ...EMPTY_ORDERS, ...(apiData?.orders_overview || {}) }} />
        <InventorySummary blocks={apiData?.inventory_blocks || []} warehouses={apiData?.warehouse_locations || []} />
        <AlertsNotifications alerts={alertsLive} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {!isOperator(user) && (
          <div className="xl:col-span-3">
            <QuickActions />
          </div>
        )}
        <div className={isOperator(user) ? "xl:col-span-7" : "xl:col-span-5"}>
          <RecentWorkOrders workOrders={workOrdersLive} />
        </div>
        <div className={isOperator(user) ? "xl:col-span-5" : "xl:col-span-4"}>
          <TodaysSummary items={apiData?.todays_summary || []} />
        </div>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500 sm:flex-row sm:text-left">
        <p>{t("refDashboard.copyright")}</p>
        <p>{t("refDashboard.poweredBy")}</p>
      </footer>
    </div>
  );
}
