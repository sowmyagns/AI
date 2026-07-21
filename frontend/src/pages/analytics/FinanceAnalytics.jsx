import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee, TrendingDown, TrendingUp, Percent, Wallet, CreditCard, Receipt, Building2, BarChart3,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, ComposedChart,
} from "recharts";

import Loader from "../../components/common/Loader";
import AnalyticsAlertsBanner from "../../components/analytics/AnalyticsAlertsBanner";
import AnalyticsChartCard from "../../components/analytics/AnalyticsChartCard";
import AnalyticsDashboardHeader from "../../components/analytics/AnalyticsDashboardHeader";
import AnalyticsFilterBar from "../../components/analytics/AnalyticsFilterBar";
import AnalyticsKpiCard from "../../components/analytics/AnalyticsKpiCard";
import DrillDownBreadcrumb from "../../components/analytics/DrillDownBreadcrumb";
import { useToast } from "../../context/ToastContext";
import { getFinanceAnalytics } from "../../api/analyticsApi";
import { CHART_COLORS, SOURCE_LINKS, formatInr } from "../../data/analyticsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

const KPI_ICONS = {
  revenue: IndianRupee, expenses: TrendingDown, profit: TrendingUp, margin: Percent,
  cashflow: Wallet, receivables: CreditCard, payables: Receipt, gst: Building2,
  operating: BarChart3, monthly_profit: TrendingUp, ebitda: IndianRupee, working_capital: Wallet,
};

const emptyData = {
  kpis: [], alerts: [], revenue_vs_expense: [], cash_flow: [],
  profit_trend: [], expense_category: [], receivable_aging: [],
  monthly_margin: [], drill_revenue: [], last_updated: null,
};

export default function FinanceAnalytics() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [drillTrail, setDrillTrail] = useState([]);
  const [filters, setFilters] = useState({
    fiscalYear: "2025-26", month: "All Months", quarter: "All Quarters",
    plant: "All Plants", dateFrom: "", dateTo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFinanceAnalytics();
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
      addToast("Failed to load finance analytics", "error");
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

  if (loading && !data.kpis?.length) return <Loader label="Loading finance analytics..." />;
  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 bg-slate-50 p-4 dark:bg-slate-900 sm:p-6">
      <AnalyticsDashboardHeader
        title="Finance Analytics"
        subtitle="Revenue, expenses, cash flow, receivables, margins — integrated with Finance module."
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
        dateFrom={filters.dateFrom} onDateFromChange={setF("dateFrom")}
        dateTo={filters.dateTo} onDateToChange={setF("dateTo")}
        showAll={false}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(data.kpis || []).map((kpi) => (
          <AnalyticsKpiCard
            key={kpi.key}
            kpi={kpi}
            icon={KPI_ICONS[kpi.key]}
            onClick={(k) => k.key === "revenue" && setDrillTrail(data.drill_revenue || [])}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChartCard id="chart-rev-exp" title="Revenue vs Expense" data={data.revenue_vs_expense} dataKeys={["label", "value", "value2"]} sourceLink={SOURCE_LINKS.finance} sourceLabel="Finance">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.revenue_vs_expense}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => formatInr(v)} />
              <Tooltip formatter={(v) => formatInr(v)} />
              <Legend />
              <Bar dataKey="value" name="Revenue" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="value2" name="Expense" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-cashflow" title="Cash Flow" data={data.cash_flow} dataKeys={["label", "value", "value2"]} sourceLink={SOURCE_LINKS.finance} sourceLabel="Finance">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.cash_flow}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis tickFormatter={(v) => formatInr(v)} fontSize={11} />
              <Tooltip formatter={(v, n) => [formatInr(v), n]} />
              <Legend />
              <Area type="monotone" dataKey="value" name="Inflow" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} />
              <Area type="monotone" dataKey="value2" name="Outflow" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-profit" title="Profit Trend" data={data.profit_trend} sourceLink="/accounts/profit-loss" sourceLabel="P&L">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.profit_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis tickFormatter={(v) => formatInr(v)} fontSize={11} />
              <Tooltip formatter={(v) => [formatInr(v), "Profit"]} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-expense-cat" title="Expense Category" data={data.expense_category} sourceLink={SOURCE_LINKS.finance} sourceLabel="Finance">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.expense_category || []} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                {(data.expense_category || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, "Share"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-recv-aging" title="Receivable Aging" data={data.receivable_aging} sourceLink="/finance/accounts-receivable" sourceLabel="AR">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.receivable_aging}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={10} />
              <YAxis tickFormatter={(v) => formatInr(v)} fontSize={11} />
              <Tooltip formatter={(v) => [formatInr(v), "Amount"]} />
              <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>

        <AnalyticsChartCard id="chart-margin" title="Monthly Margin" data={data.monthly_margin} sourceLink="/accounts/profit-loss" sourceLabel="P&L">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthly_margin}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Margin"]} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[4]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
