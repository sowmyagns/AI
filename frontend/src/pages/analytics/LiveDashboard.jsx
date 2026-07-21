import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, Cog, Package, Sparkles, Truck, Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Loader from "../../components/common/Loader";
import AnalyticsAlertsBanner from "../../components/analytics/AnalyticsAlertsBanner";
import AnalyticsDashboardHeader from "../../components/analytics/AnalyticsDashboardHeader";
import AnalyticsKpiCard from "../../components/analytics/AnalyticsKpiCard";
import { useToast } from "../../context/ToastContext";
import { getLiveDashboard } from "../../api/analyticsApi";
import { CHART_COLORS } from "../../data/analyticsMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

const emptyData = {
  current_production: 0,
  active_machines: 0,
  total_machines: 0,
  todays_orders: 0,
  dispatches_today: 0,
  breakdown_alerts: 0,
  live_oee: 0,
  alerts: [],
  ai_insights: [],
  production_pulse: [],
};

export default function LiveDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLiveDashboard();
      if (res.data) setData({ ...emptyData, ...res.data });
      else setData(emptyData);
    } catch {
      setData(emptyData);
      addToast("Failed to load live dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  if (loading && !data.production_pulse) return <Loader label="Loading live dashboard..." />;

  const liveKpis = [
    { key: "prod", label: "Current Production", value: data.current_production, change_pct: 4.2, unit: "units/hr", format: "number" },
    { key: "machines", label: "Active Machines", value: `${data.active_machines}/${data.total_machines}`, format: "number" },
    { key: "orders", label: "Today's Orders", value: data.todays_orders, change_pct: 8.0, format: "number" },
    { key: "dispatch", label: "Dispatches Today", value: data.dispatches_today, change_pct: 12.0, format: "number" },
    { key: "breakdown", label: "Breakdown Alerts", value: data.breakdown_alerts, change_pct: -25, format: "number" },
    { key: "oee", label: "Live OEE", value: data.live_oee, change_pct: 1.5, unit: "%", format: "percent" },
  ];

  const icons = { prod: Activity, machines: Cog, orders: Package, dispatch: Truck, breakdown: AlertTriangle, oee: Zap };

  return (
    <div className="space-y-6 bg-slate-950 p-4 text-slate-100 sm:p-6">
      <AnalyticsDashboardHeader
        title="Live Dashboard"
        subtitle="Real-time production, machines, orders, dispatches, and OEE."
        lastUpdated={data.last_updated}
        onRefresh={load}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={setAutoRefresh}
        loading={loading}
      />

      <Link to="/analytics/executive" className="inline-block text-xs font-semibold text-blue-400 hover:underline">← Back to CEO Dashboard</Link>

      <AnalyticsAlertsBanner alerts={data.alerts} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {liveKpis.map((kpi) => (
          <div key={kpi.key} className="[&_.rounded-2xl]:border-slate-700 [&_.rounded-2xl]:bg-slate-900">
            <AnalyticsKpiCard kpi={kpi} icon={icons[kpi.key]} />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
        <h3 className="mb-4 text-sm font-semibold">Production Pulse (Today)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data.production_pulse}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "none" }} />
            <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.25} name="Units/hr" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-200">
          <Sparkles className="h-4 w-4" /> AI Insights
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(data.ai_insights || []).map((insight, i) => (
            <div key={i} className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-3 text-sm text-emerald-100">
              {insight.message}
              {insight.confidence != null && (
                <p className="mt-1 text-xs text-emerald-400">{Math.round(insight.confidence * 100)}% confidence</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
