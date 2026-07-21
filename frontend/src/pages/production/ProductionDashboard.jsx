import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Factory,
  Package,
  RefreshCw,
  Users,
  AlertTriangle,
} from "lucide-react";

import Loader from "../../components/common/Loader";
import ProductionManagerNav from "../../components/production/ProductionManagerNav";
import { useToast } from "../../context/ToastContext";
import { getProductionHub } from "../../api/productionApi";
import {
  HUB_FLOW,
  HUB_MODULES,
  hubStatusColor,
} from "../../data/productionHubMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";

function StatusPanel({ title, items, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-[#2563EB]" />}
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <dl className="space-y-2">
        {items.map(([label, value, status]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <dt className="text-slate-500">{label}</dt>
            <dd className={`font-bold tabular-nums ${hubStatusColor(status)}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ModuleCard({ label, to, color }) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl ${color} px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90`}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export default function ProductionDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductionHub();
      if (res?.data) setHub(res.data);
      else setHub({});
    } catch {
      addToast("Failed to load production hub", "error");
      setHub({});
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  if (loading) return <Loader label="Loading production hub..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ProductionManagerNav />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Hub</h1>
          <p className="mt-1 text-sm text-slate-500">
            Unified production control center — planning, schedule, allocation, shop floor, batches, and quality.
          </p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </header>

      <ManufacturingWorkflowBar currentStepId="production" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#2563EB] to-indigo-600 p-5 text-white shadow-sm">
          <p className="text-xs font-medium opacity-80">Running Jobs</p>
          <p className="mt-1 text-3xl font-bold">{hub.running_jobs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Production In Progress</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{hub.production_in_progress}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Completed Today</p>
          <p className="mt-1 text-3xl font-bold text-green-600">{hub.production_completed_today}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Quality Passed</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{hub.quality_passed}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatusPanel
          title="Machine Status"
          icon={Cpu}
          items={[
            ["Running", hub.machines_running, "running"],
            ["Idle", hub.machines_idle, "idle"],
            ["Down / Maintenance", hub.machines_down, "warning"],
          ]}
        />
        <StatusPanel
          title="Production Status"
          icon={Factory}
          items={[
            ["In Progress", hub.production_in_progress, "running"],
            ["Completed Today", hub.production_completed_today, "ok"],
            ["Running Jobs", hub.running_jobs, "running"],
          ]}
        />
        <StatusPanel
          title="Material Status"
          icon={Package}
          items={[
            ["Available", hub.material_available, "ok"],
            ["Shortages", hub.material_shortages, "warning"],
          ]}
        />
        <StatusPanel
          title="Operator Status"
          icon={Users}
          items={[
            ["Present", hub.operators_present, "ok"],
            ["Absent", hub.operators_absent, "warning"],
          ]}
        />
        <StatusPanel
          title="Quality Status"
          icon={CheckCircle2}
          items={[
            ["Passed", hub.quality_passed, "ok"],
            ["Failed", hub.quality_failed, "warning"],
          ]}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Quick Module Access
          </h3>
          <div className="grid gap-2">
            {HUB_MODULES.map((m) => (
              <ModuleCard key={m.to} {...m} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Running Jobs</h3>
          <div className="space-y-2">
            {(hub.recent_jobs || []).map((j) => (
              <div key={j.work_order_number} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{j.work_order_number}</p>
                  <p className="text-xs text-slate-500">{j.product} · {j.machine}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-600">{j.progress_pct}%</p>
                  <p className="text-[10px] capitalize text-slate-500">{j.status}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Machine Status</h3>
          <div className="grid grid-cols-2 gap-2">
            {(hub.machine_status || []).map((m) => (
              <div key={m.code} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-xs font-bold text-slate-800">{m.name}</p>
                <p className="text-[10px] capitalize text-slate-500">{m.status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-slate-500">Module Integration Flow</p>
        <div className="flex flex-wrap gap-2">
          {HUB_FLOW.map((step, i) => (
            <span key={step} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-[#2563EB]">{step}</span>
              {i < HUB_FLOW.length - 1 && <span className="text-slate-300">↓</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
