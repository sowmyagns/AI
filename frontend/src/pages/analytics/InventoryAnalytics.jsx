import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Archive, BarChart3, Box, IndianRupee, Package, Percent, RefreshCw, TrendingUp, Warehouse,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";

import Loader from "../../components/common/Loader";
import AnalyticsAlertsBanner from "../../components/analytics/AnalyticsAlertsBanner";
import AnalyticsChartCard from "../../components/analytics/AnalyticsChartCard";
import AnalyticsDashboardHeader from "../../components/analytics/AnalyticsDashboardHeader";
import AnalyticsFilterBar from "../../components/analytics/AnalyticsFilterBar";
import AnalyticsKpiCard from "../../components/analytics/AnalyticsKpiCard";
import { useToast } from "../../context/ToastContext";
import { getInventoryAnalytics } from "../../api/analyticsApi";
import { CHART_COLORS, SOURCE_LINKS, formatInr } from "../../data/analyticsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

const KPI_ICONS = {
  turnover: TrendingUp, outflow: Package, avg_inv: Box, value: IndianRupee,
  fast: BarChart3, slow: RefreshCw, dead: Archive, reorder: AlertTriangle,
  accuracy: Percent, warehouse: Warehouse,
};

const emptyData = { kpis: [], alerts: [], stock_in_vs_out: [], warehouse_occupancy: [], abc_analysis: [], inventory_aging: [], monthly_consumption: [], value_trend: [], fast_moving: [], slow_moving: [], dead_stock: [], reorder_alerts: [] };

export default function InventoryAnalytics() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [filters, setFilters] = useState({
    fiscalYear: "2025-26", month: "All Months", quarter: "All Quarters",
    plant: "All Plants", department: "All Departments", warehouse: "All Warehouses",
    product: "All Products", customer: "All Customers", machine: "All Machines",
    dateFrom: "", dateTo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventoryAnalytics();
      if (res.data) setData({ ...emptyData, ...res.data });
      else setData(emptyData);
    } catch {
      setData(emptyData);
      addToast("Failed to load inventory analytics", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  if (loading && !data.kpis) return <Loader label="Loading inventory analytics..." />;
  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 bg-slate-50 p-4 dark:bg-slate-900 sm:p-6">
      <AnalyticsDashboardHeader
        title="Inventory KPI"
        subtitle="Turnover, stock value, ABC analysis, aging, warehouse occupancy."
        lastUpdated={data.last_updated}
        onRefresh={load}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        loading={loading}
      />

      <AnalyticsAlertsBanner alerts={data.alerts} />

      <AnalyticsFilterBar
        fiscalYear={filters.fiscalYear} onFiscalYearChange={setF("fiscalYear")}
        month={filters.month} onMonthChange={setF("month")}
        quarter={filters.quarter} onQuarterChange={setF("quarter")}
        plant={filters.plant} onPlantChange={setF("plant")}
        warehouse={filters.warehouse} onWarehouseChange={setF("warehouse")}
        dateFrom={filters.dateFrom} onDateFromChange={setF("dateFrom")}
        dateTo={filters.dateTo} onDateToChange={setF("dateTo")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {(data.kpis || []).map((kpi) => (
          <AnalyticsKpiCard key={kpi.key} kpi={kpi} icon={KPI_ICONS[kpi.key] || Box} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChartCard id="chart-stock-io" title="Stock In vs Stock Out" data={data.stock_in_vs_out} dataKeys={["label", "value", "value2"]} sourceLink={SOURCE_LINKS.inventory} sourceLabel="Inventory">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.stock_in_vs_out}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Stock In" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="value2" name="Stock Out" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-warehouse" title="Warehouse Occupancy" data={data.warehouse_occupancy} sourceLink={SOURCE_LINKS.inventory} sourceLabel="Inventory">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.warehouse_occupancy}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, "Occupancy"]} />
              <Bar dataKey="value" fill={CHART_COLORS[2]} name="%" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-abc" title="ABC Analysis" data={data.abc_analysis} sourceLink={SOURCE_LINKS.inventory} sourceLabel="Inventory">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.abc_analysis} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={100} label>
                {data.abc_analysis.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, "Share"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-aging" title="Inventory Aging" data={data.inventory_aging} sourceLink={SOURCE_LINKS.inventory} sourceLabel="Inventory">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.inventory_aging}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => [`${v}%`, "Share"]} />
              <Bar dataKey="value" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-consumption" title="Monthly Consumption" data={data.monthly_consumption} sourceLink={SOURCE_LINKS.inventory} sourceLabel="Inventory">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly_consumption}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[4]} strokeWidth={2} name="Units" />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-value-trend" title="Inventory Value Trend" data={data.value_trend} sourceLink={SOURCE_LINKS.inventory} sourceLabel="Inventory">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.value_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => formatInr(v)} />
              <Tooltip formatter={(v) => [formatInr(v), "Value"]} />
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} name="Value" />
            </AreaChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { title: "Fast Moving Items", rows: data.fast_moving, cols: ["item", "qty", "turns"] },
          { title: "Slow Moving Items", rows: data.slow_moving, cols: ["item", "qty", "days_idle"] },
          { title: "Dead Stock", rows: data.dead_stock, cols: ["item", "qty", "value"] },
          { title: "Reorder Alerts", rows: data.reorder_alerts, cols: ["item", "current", "reorder", "warehouse"] },
        ].map(({ title, rows, cols }) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {rows?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b text-slate-500">{cols.map((c) => <th key={c} className="pb-2 pr-3 capitalize">{c.replace("_", " ")}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                        {cols.map((c) => <td key={c} className="py-2 pr-3">{c === "value" ? formatInr(r[c]) : r[c]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No items</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
