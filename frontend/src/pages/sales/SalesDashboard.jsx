import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, IndianRupee, RefreshCw, ShoppingCart, Truck, Users } from "lucide-react";

import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { useToast } from "../../context/ToastContext";
import { getSalesHub } from "../../api/salesApi";
import { SALES_FLOW, formatInr } from "../../data/salesMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

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

const alertIcons = { overdue_payment: IndianRupee, pending_dispatch: Truck, low_stock: AlertTriangle, expiring_quote: AlertTriangle };
const emptyHub = {
  monthly_revenue: 0,
  total_orders: 0,
  pending_orders: 0,
  new_customers: 0,
  dispatch_pending: 0,
  outstanding_payments: 0,
  top_customers: [],
  alerts: [],
};

export default function SalesDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState(emptyHub);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesHub();
      if (res.data) setHub({ ...emptyHub, ...res.data });
      else setHub(emptyHub);
    } catch {
      addToast("Failed to load sales hub", "error");
      setHub(emptyHub);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  if (loading) return <Loader label="Loading sales dashboard..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Revenue, orders, dispatch, payments, and sales executive performance.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      <ManufacturingWorkflowBar currentStepId="dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Monthly Revenue" value={formatInr(hub.monthly_revenue)} icon={IndianRupee} color="bg-blue-600" />
        <KpiCard label="Total Orders" value={hub.total_orders} icon={ShoppingCart} color="bg-indigo-600" />
        <KpiCard label="Pending Orders" value={hub.pending_orders} icon={ShoppingCart} color="bg-amber-500" />
        <KpiCard label="Dispatch Pending" value={hub.dispatch_pending} icon={Truck} color="bg-teal-600" />
        <KpiCard label="Outstanding Payments" value={formatInr(hub.outstanding_payments)} icon={IndianRupee} color="bg-red-500" />
        <KpiCard label="New Customers" value={hub.new_customers} icon={Users} color="bg-green-600" />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {SALES_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < SALES_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Top Customers</h2>
          <ul className="space-y-2">
            {(hub.top_customers || []).map((c) => (
              <li key={c.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-slate-500">{c.orders} orders</span>
              </li>
            ))}
          </ul>
          <Link to="/sales/customers" className="mt-3 inline-block text-sm font-semibold text-[#2563EB] hover:underline">View all customers →</Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Sales Executive Performance</h2>
          <ul className="space-y-2">
            {(hub.sales_executive_performance || []).map((e) => (
              <li key={e.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{e.name}</span>
                <span><span className="font-semibold text-[#2563EB]">{formatInr(e.revenue)}</span> · {e.orders} orders</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Notifications</h2>
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
        <QuickLink to="/sales/leads" label="Leads" />
        <QuickLink to="/sales/quotations" label="Quotations" />
        <QuickLink to="/sales/orders" label="Sales Orders" />
        <QuickLink to="/sales/dispatch" label="Dispatch" />
        <QuickLink to="/sales/invoices" label="Invoices" />
        <QuickLink to="/sales/payments" label="Payments" />
        <QuickLink to="/inventory/finished-goods" label="Finished Goods" />
        <QuickLink to="/production" label="Production" />
      </div>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB]">
      {label} →
    </Link>
  );
}
