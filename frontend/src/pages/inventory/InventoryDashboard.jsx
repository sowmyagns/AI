import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Box, Package, RefreshCw, TrendingUp, Zap } from "lucide-react";

import Loader from "../../components/common/Loader";
import StoreManagerNav from "../../components/inventory/StoreManagerNav";
import { useToast } from "../../context/ToastContext";
import { getInventoryHub } from "../../api/inventoryApi";
import { INVENTORY_FLOW, formatInr } from "../../data/inventoryMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value ?? 0}</p></div>
        {Icon && <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Raw Materials", to: "/inventory/raw-materials" },
  { label: "Finished Goods", to: "/inventory/finished-goods" },
  { label: "Stock Transfer", to: "/inventory/stock-transfer" },
  { label: "Stock Adjustment", to: "/inventory/stock-adjustment" },
  { label: "Stock Ledger", to: "/inventory/stock-ledger" },
  { label: "Warehouses", to: "/inventory/warehouses" },
];

export default function InventoryDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventoryHub();
      if (res?.data) setHub(res.data);
      else setHub({});
    } catch {
      addToast("Failed to load inventory hub", "error");
      setHub({});
    }
    finally { setLoading(false); }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  if (loading) return <div className="space-y-6"><StoreManagerNav /><Loader label="Loading inventory dashboard..." /></div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <StoreManagerNav />
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Inventory Dashboard</h1><p className="mt-1 text-sm text-slate-500">Enterprise inventory control — value, movement, ABC analysis, and warehouse overview.</p></div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      <ManufacturingWorkflowBar currentStepId="raw_material" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Inventory Value" value={formatInr(hub.total_inventory_value)} icon={TrendingUp} color="bg-[#2563EB]" />
        <KpiCard label="Low Stock Items" value={hub.low_stock_items} icon={AlertTriangle} color="bg-amber-500" />
        <KpiCard label="Dead Stock" value={hub.dead_stock} icon={Box} color="bg-slate-500" />
        <KpiCard label="Fast Moving" value={hub.fast_moving} icon={Zap} color="bg-green-500" />
        <KpiCard label="Slow Moving" value={hub.slow_moving} icon={Package} color="bg-orange-500" />
        <KpiCard label="Today's Transactions" value={hub.todays_transactions} icon={TrendingUp} color="bg-indigo-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Warehouse Stock</h3>
          <div className="space-y-3">
            {(hub.warehouse_stock || []).map((w) => (
              <div key={w.name}>
                <div className="mb-0.5 flex justify-between text-sm"><span className="font-medium text-slate-700">{w.name}</span><span className="tabular-nums text-slate-600">{w.quantity?.toLocaleString()}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, (w.quantity / 10000) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-800">Top 10 Materials</h3>
          <ol className="space-y-2">
            {(hub.top_materials || []).map((m, i) => (
              <li key={m.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span><span className="font-bold text-[#2563EB]">{i + 1}.</span> {m.name}</span>
                <span className="font-semibold tabular-nums">{m.qty?.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Quick Module Access</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{l.label}<ArrowRight className="h-3.5 w-3.5" /></Link>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 px-4 py-3">
        {INVENTORY_FLOW.map((step, i) => (
          <span key={step} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-[#2563EB]">{step}</span>
            {i < INVENTORY_FLOW.length - 1 && <span className="text-slate-300">↓</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
