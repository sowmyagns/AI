import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee, ShoppingCart, Users, Percent, TrendingUp, Truck, Target, BarChart3,
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
import DrillDownBreadcrumb from "../../components/analytics/DrillDownBreadcrumb";
import { useToast } from "../../context/ToastContext";
import { getSalesAnalytics } from "../../api/analyticsApi";
import { CHART_COLORS, SOURCE_LINKS, formatInr } from "../../data/analyticsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

const KPI_ICONS = {
  revenue: IndianRupee, orders: ShoppingCart, customers: Users, conversion: Percent,
  aov: Target, growth: TrendingUp, pending: BarChart3, dispatch: Truck,
};

const emptyData = {
  kpis: [], alerts: [], monthly_revenue: [], top_customers: [],
  top_products: [], regional_sales: [], sales_funnel: [],
  quotation_conversion: [], order_status: [], drill_revenue: [],
  last_updated: null,
};

export default function SalesAnalytics() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [drillTrail, setDrillTrail] = useState([]);
  const [filters, setFilters] = useState({
    fiscalYear: "2025-26", month: "All Months", quarter: "All Quarters",
    plant: "All Plants", customer: "All Customers", dateFrom: "", dateTo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesAnalytics();
      if (res.data) {
        setData({ ...emptyData, ...res.data });
        setDrillTrail(res.data.drill_revenue || []);
      } else {
        setData(emptyData);
        setDrillTrail([]);
      }
    } catch {
      setData(emptyData);
      setDrillTrail([]);
      addToast("Failed to load sales analytics", "error");
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

  if (loading && !data.kpis?.length) return <Loader label="Loading sales analytics..." />;
  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));

  const handleKpiClick = (kpi) => {
    if (kpi.key === "revenue" && data.drill_revenue) setDrillTrail(data.drill_revenue);
  };

  return (
    <div className="space-y-6 bg-slate-50 p-4 dark:bg-slate-900 sm:p-6">
      <AnalyticsDashboardHeader
        title="Sales Analytics"
        subtitle="Revenue, orders, funnel, top customers/products — integrated with Sales module."
        lastUpdated={data.last_updated}
        onRefresh={load}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        loading={loading}
      />

      <AnalyticsAlertsBanner alerts={data.alerts} />
      <DrillDownBreadcrumb trail={drillTrail} onSelect={(_, i) => setDrillTrail(drillTrail.slice(0, i + 1))} />

      <AnalyticsFilterBar
        fiscalYear={filters.fiscalYear} onFiscalYearChange={setF("fiscalYear")}
        month={filters.month} onMonthChange={setF("month")}
        quarter={filters.quarter} onQuarterChange={setF("quarter")}
        plant={filters.plant} onPlantChange={setF("plant")}
        customer={filters.customer} onCustomerChange={setF("customer")}
        dateFrom={filters.dateFrom} onDateFromChange={setF("dateFrom")}
        dateTo={filters.dateTo} onDateToChange={setF("dateTo")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(data.kpis || []).map((kpi) => (
          <AnalyticsKpiCard key={kpi.key} kpi={kpi} icon={KPI_ICONS[kpi.key] || BarChart3} onClick={() => handleKpiClick(kpi)} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChartCard id="chart-monthly-rev" title="Monthly Revenue" data={data.monthly_revenue} dataKeys={["label", "value"]} sourceLink={SOURCE_LINKS.sales} sourceLabel="Sales">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.monthly_revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis /><Tooltip formatter={(v) => formatInr(v)} />
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-top-cust" title="Top Customers" data={data.top_customers} dataKeys={["label", "value"]} sourceLink={SOURCE_LINKS.sales} sourceLabel="Sales">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_customers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis /><Tooltip />
              <Bar dataKey="value" name="Orders" fill={CHART_COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-top-prod" title="Top Products" data={data.top_products} dataKeys={["label", "value"]} sourceLink={SOURCE_LINKS.sales} sourceLabel="Sales">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.top_products}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis /><Tooltip />
              <Bar dataKey="value" name="Qty" fill={CHART_COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-funnel" title="Sales Funnel" data={data.sales_funnel} dataKeys={["label", "value"]} sourceLink={SOURCE_LINKS.sales} sourceLabel="Sales">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.sales_funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" /><YAxis dataKey="label" type="category" width={100} /><Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS[3]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-order-status" title="Order Status" data={data.order_status} dataKeys={["label", "value"]} sourceLink={SOURCE_LINKS.sales} sourceLabel="Sales">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.order_status} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                {(data.order_status || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-quote-conv" title="Quotation Conversion" data={data.quotation_conversion} dataKeys={["label", "value"]} sourceLink={SOURCE_LINKS.sales} sourceLabel="Sales">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.quotation_conversion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[4]} name="Conversion %" />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
