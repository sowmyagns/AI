import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, BarChart3, Box, CheckCircle, Cog, Factory, IndianRupee,
  Sparkles, Star, TrendingUp, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart,
} from "recharts";

import Loader from "../../components/common/Loader";
import AnalyticsAlertsBanner from "../../components/analytics/AnalyticsAlertsBanner";
import AnalyticsChartCard from "../../components/analytics/AnalyticsChartCard";
import AnalyticsDashboardHeader from "../../components/analytics/AnalyticsDashboardHeader";
import AnalyticsKpiCard from "../../components/analytics/AnalyticsKpiCard";
import { useToast } from "../../context/ToastContext";
import { getExecutiveHub } from "../../api/analyticsApi";
import { CHART_COLORS, formatInr } from "../../data/analyticsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

const KPI_ICONS = {
  revenue: IndianRupee, profit: TrendingUp, production: Factory, inventory: Box,
  machine_health: Cog, worker_eff: Users, satisfaction: Star, pending_orders: BarChart3,
  quality: CheckCircle,
};

const emptyData = { kpis: [], alerts: [], benchmarks: [], revenue_trend: [], production_trend: [], inventory_value_trend: [], machine_health: [], ai_insights: [] };

export default function ExecutiveDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExecutiveHub();
      if (res.data) setData({ ...emptyData, ...res.data });
      else setData(emptyData);
    } catch {
      setData(emptyData);
      addToast("Failed to load executive hub", "error");
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

  if (loading && !data.kpis) return <Loader label="Loading executive dashboard..." />;

  return (
    <div className="space-y-6 bg-gradient-to-b from-slate-900 to-slate-800 p-4 text-slate-100 sm:p-6">
      <AnalyticsDashboardHeader
        title="CEO Dashboard"
        subtitle="Executive view — revenue, profit, production, inventory, quality on one screen."
        lastUpdated={data.last_updated}
        onRefresh={load}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        loading={loading}
      />

      <div className="flex flex-wrap gap-2">
        <Link to="/analytics/live" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Live Dashboard</Link>
        <Link to="/analytics/production" className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700">Production</Link>
        <Link to="/analytics/inventory" className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700">Inventory</Link>
        <Link to="/analytics/sales" className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700">Sales</Link>
        <Link to="/analytics/finance" className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700">Finance</Link>
      </div>

      <AnalyticsAlertsBanner alerts={data.alerts} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {(data.kpis || []).map((kpi) => (
          <div key={kpi.key} className="[&_.rounded-2xl]:border-slate-600 [&_.rounded-2xl]:bg-slate-800 [&_p]:text-slate-300">
            <AnalyticsKpiCard kpi={kpi} icon={KPI_ICONS[kpi.key] || Activity} />
          </div>
        ))}
      </div>

      {data.benchmarks?.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {data.benchmarks.map((b) => (
            <div key={b.label} className="rounded-2xl border border-slate-600 bg-slate-800/80 p-4">
              <p className="text-xs font-medium text-slate-400">{b.label} — Industry Benchmark</p>
              <div className="mt-2 flex items-end gap-4">
                <div><p className="text-2xl font-bold text-blue-400">{b.current}%</p><p className="text-[10px] text-slate-500">Current</p></div>
                <div><p className="text-lg font-semibold text-slate-300">{b.target}%</p><p className="text-[10px] text-slate-500">Target</p></div>
                <div><p className="text-lg font-semibold text-emerald-400">{b.industry}%</p><p className="text-[10px] text-slate-500">Industry</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-600 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-sm font-semibold">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenue_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => formatInr(v)} fontSize={11} />
              <Tooltip formatter={(v) => [formatInr(v), "Revenue"]} contentStyle={{ background: "#1e293b", border: "none" }} />
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-600 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-sm font-semibold">Production Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.production_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none" }} />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS[1]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-600 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-sm font-semibold">Inventory Value</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.inventory_value_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" tickFormatter={(v) => formatInr(v)} fontSize={11} />
              <Tooltip formatter={(v) => [formatInr(v), "Value"]} contentStyle={{ background: "#1e293b", border: "none" }} />
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-600 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-sm font-semibold">Machine Health</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.machine_health}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={11} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none" }} />
              <Bar dataKey="value" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-500/30 bg-violet-950/40 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-200">
          <Sparkles className="h-4 w-4" /> AI Insights (Preview)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data.ai_insights || []).map((insight, i) => (
            <div key={i} className="rounded-xl border border-violet-500/20 bg-slate-900/60 p-3 text-sm">
              <p className="text-violet-100">{insight.message}</p>
              {insight.confidence != null && (
                <p className="mt-1 text-xs text-violet-400">Confidence: {Math.round(insight.confidence * 100)}%</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
