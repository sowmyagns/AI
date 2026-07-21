import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, BarChart3, CheckCircle, ClipboardCheck, RefreshCw, TrendingDown, XCircle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getQualityHub } from "../../api/qualityApi";
import { QUALITY_FLOW, formatPct, qcStatusColor } from "../../data/qualityMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p></div>
        {Icon && <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>}
      </div>
    </div>
  );
}

const alertIcons = { pending: ClipboardCheck, defect: AlertTriangle, yield: TrendingDown, calibration: BarChart3 };

export default function QualityDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQualityHub();
      if (res.data) setHub(res.data);
      else setHub({});
    } catch {
      addToast("Failed to load quality hub", "error");
      setHub({});
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  if (loading) return <Loader label="Loading quality dashboard..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Inspection KPIs, yield trends, defect analysis, and QC performance.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      <ManufacturingWorkflowBar currentStepId="quality" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Inspections" value={hub.total_inspections} icon={ClipboardCheck} color="bg-blue-600" />
        <KpiCard label="Passed" value={hub.passed} icon={CheckCircle} color="bg-green-600" />
        <KpiCard label="Failed" value={hub.failed} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Rejected" value={hub.rejected} icon={XCircle} color="bg-red-600" />
        <KpiCard label="Yield %" value={formatPct(hub.yield_pct)} icon={CheckCircle} color="bg-teal-600" />
        <KpiCard label="Defect Rate" value={formatPct(hub.defect_rate)} icon={TrendingDown} color="bg-orange-500" />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {QUALITY_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < QUALITY_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Pass vs Fail">
          <PieChart>
            <Pie data={hub.pass_vs_fail || []} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
              {(hub.pass_vs_fail || []).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartCard>
        <ChartCard title="Defect Trend">
          <LineChart data={hub.defect_trend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
        <ChartCard title="Monthly Yield">
          <BarChart data={hub.monthly_yield || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[85, 100]} />
            <Tooltip />
            <Bar dataKey="yield" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Supplier Quality">
          <BarChart data={hub.supplier_quality || []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#2563EB" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Machine Defects">
          <BarChart data={hub.machine_defects || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="defects" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Pareto — Defect Types">
          <BarChart data={hub.pareto_defects || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Root Cause Analysis</h2>
          <ul className="space-y-2">
            {(hub.root_cause_analysis || []).map((r) => (
              <li key={r.cause} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{r.cause}</span>
                <span className="font-semibold text-red-600">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">QC Performance</h2>
          <ul className="space-y-3">
            {(hub.qc_performance || []).map((q) => (
              <li key={q.inspector}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{q.inspector}</span><span className="text-slate-500">{q.inspections} inspections · {q.pass_rate}% pass</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-green-500" style={{ width: `${q.pass_rate}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Recent Inspections</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="pb-2 pr-4">Inspection No</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Result</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(hub.recent_inspections || []).map((i) => (
                <tr key={i.number} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium">{i.number}</td>
                  <td className="py-2 pr-4 capitalize">{i.type?.replace("_", " ")}</td>
                  <td className="py-2 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${qcStatusColor(i.result)}`}>{i.result}</span></td>
                  <td className="py-2">{i.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Alerts</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(hub.alerts || []).map((a, i) => {
            const Icon = alertIcons[a.type] || AlertTriangle;
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-900">{a.message}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink to="/quality/incoming" label="Incoming Inspection" />
        <QuickLink to="/quality/in-process" label="In Process QC" />
        <QuickLink to="/quality/final" label="Final QC" />
        <QuickLink to="/quality/batch-reports" label="Batch Reports" />
        <QuickLink to="/quality/defects" label="Defect Tracking" />
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#2563EB] shadow-sm hover:bg-blue-50">
      {label} →
    </Link>
  );
}
