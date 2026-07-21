import { useCallback, useEffect, useState } from "react";
import {
  Activity, BarChart3, Box, CheckCircle, Clock, Cog, Factory, Gauge,
  IndianRupee, Package, Percent, Target, TrendingUp, Users, Zap,
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
import { getProductionAnalytics } from "../../api/analyticsApi";
import { CHART_COLORS, SOURCE_LINKS } from "../../data/analyticsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

const KPI_ICONS = {
  planned: Target, actual: Factory, efficiency: Gauge, oee: Activity,
  utilization: Cog, rejection: Percent, downtime: Clock, cost: IndianRupee,
  wip: Package, completed: CheckCircle, worker: Users, avg_month: BarChart3,
};

const fmtTooltip = (v, name) => [Number(v).toLocaleString("en-IN"), name];
const emptyData = { kpis: [], alerts: [], monthly_production: [], production_trend: [], daily_output: [], shift_wise: [], machine_wise: [], product_wise: [], operator_performance: [], downtime_analysis: [], benchmarks: [] };

export default function ProductionAnalytics() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeKpi, setActiveKpi] = useState(null);
  const [filters, setFilters] = useState({
    fiscalYear: "2025-26", month: "All Months", quarter: "All Quarters",
    plant: "All Plants", department: "All Departments", warehouse: "All Warehouses",
    product: "All Products", customer: "All Customers", machine: "All Machines",
    dateFrom: "", dateTo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductionAnalytics();
      if (res.data) setData({ ...emptyData, ...res.data });
      else setData(emptyData);
    } catch {
      setData(emptyData);
      addToast("Failed to load production analytics", "error");
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

  if (loading && !data.kpis) return <Loader label="Loading production analytics..." />;

  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 bg-slate-50 p-4 dark:bg-slate-900 sm:p-6">
      <AnalyticsDashboardHeader
        title="Production KPI"
        subtitle="Planned vs actual, OEE, machine utilization, downtime, and operator performance."
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
        department={filters.department} onDepartmentChange={setF("department")}
        warehouse={filters.warehouse} onWarehouseChange={setF("warehouse")}
        product={filters.product} onProductChange={setF("product")}
        customer={filters.customer} onCustomerChange={setF("customer")}
        machine={filters.machine} onMachineChange={setF("machine")}
        dateFrom={filters.dateFrom} onDateFromChange={setF("dateFrom")}
        dateTo={filters.dateTo} onDateToChange={setF("dateTo")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(data.kpis || []).map((kpi) => (
          <AnalyticsKpiCard
            key={kpi.key}
            kpi={kpi}
            icon={KPI_ICONS[kpi.key] || Zap}
            active={activeKpi?.key === kpi.key}
            onClick={setActiveKpi}
          />
        ))}
      </div>

      {data.benchmarks?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {data.benchmarks.map((b) => (
            <div key={b.label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-medium text-slate-500">{b.label}</p>
              <div className="mt-2 flex items-end gap-4">
                <div><p className="text-2xl font-bold text-blue-600">{b.current}%</p><p className="text-[10px] text-slate-400">Current</p></div>
                <div><p className="text-lg font-semibold text-slate-600">{b.target}%</p><p className="text-[10px] text-slate-400">Target</p></div>
                <div><p className="text-lg font-semibold text-emerald-600">{b.industry}%</p><p className="text-[10px] text-slate-400">Industry</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChartCard id="chart-monthly-prod" title="Monthly Production" subtitle="Planned vs Actual" data={data.monthly_production} dataKeys={["label", "value", "value2"]} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthly_production}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={fmtTooltip} />
              <Legend />
              <Bar dataKey="value" name="Actual" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="value2" name="Planned" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-prod-trend" title="Production Trend" data={data.production_trend} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.production_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={fmtTooltip} />
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} name="Output" />
            </AreaChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-daily" title="Daily Output" data={data.daily_output} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.daily_output}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={10} interval={4} />
              <YAxis fontSize={11} />
              <Tooltip formatter={fmtTooltip} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} name="Units" />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-shift" title="Shift Wise Production" data={data.shift_wise} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.shift_wise}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={fmtTooltip} />
              <Bar dataKey="value" name="Units" radius={[6, 6, 0, 0]}>
                {data.shift_wise.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-machine" title="Machine Wise Production" data={data.machine_wise} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.machine_wise} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" fontSize={11} />
              <YAxis dataKey="label" type="category" width={80} fontSize={11} />
              <Tooltip formatter={fmtTooltip} />
              <Bar dataKey="value" fill={CHART_COLORS[3]} name="Efficiency %" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-product" title="Product Wise Production" data={data.product_wise} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.product_wise} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                {data.product_wise.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={fmtTooltip} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-operator" title="Operator Performance" data={data.operator_performance} sourceLink={SOURCE_LINKS.production} sourceLabel="Production">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.operator_performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={11} domain={[0, 100]} />
              <Tooltip formatter={fmtTooltip} />
              <Bar dataKey="value" fill={CHART_COLORS[4]} name="Score %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-downtime" title="Downtime Analysis" data={data.downtime_analysis} sourceLink="/maintenance" sourceLabel="Maintenance">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.downtime_analysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v) => [`${v} h`, "Downtime"]} />
              <Bar dataKey="value" fill="#ef4444" name="Hours" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
