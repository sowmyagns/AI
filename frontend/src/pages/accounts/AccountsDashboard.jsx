import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, IndianRupee, Landmark, RefreshCw, TrendingDown, TrendingUp,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { useToast } from "../../context/ToastContext";
import { getFinanceHub } from "../../api/accountsApi";
import { DEMO_FINANCE_HUB, FINANCE_FLOW, formatInr } from "../../data/financeMasterData";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        {Icon && <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>}
      </div>
    </div>
  );
}

const alertIcons = { overdue: TrendingDown, gst: Landmark, ap: ArrowDownRight, budget: AlertTriangle };

export default function AccountsDashboard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hub, setHub] = useState(DEMO_FINANCE_HUB);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFinanceHub();
      if (res.data) setHub({ ...DEMO_FINANCE_HUB, ...res.data });
      else setHub(DEMO_FINANCE_HUB);
    } catch {
      addToast("Failed to load finance hub", "error");
      setHub(DEMO_FINANCE_HUB);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  useManufacturingRefresh(load);

  if (loading) return <Loader label="Loading finance dashboard..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Enterprise finance hub — cash flow, revenue, expenses, GST, and manufacturing cost insights.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </header>

      <ManufacturingWorkflowBar currentStepId="invoice" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Receivables" value={formatInr(hub.total_receivables)} icon={ArrowUpRight} color="bg-blue-600" />
        <KpiCard label="Outstanding Payables" value={formatInr(hub.outstanding_payables)} icon={ArrowDownRight} color="bg-red-500" />
        <KpiCard label="Cash Balance" value={formatInr(hub.cash_balance)} icon={IndianRupee} color="bg-green-600" />
        <KpiCard label="Monthly Revenue" value={formatInr(hub.monthly_revenue)} icon={TrendingUp} color="bg-indigo-600" />
        <KpiCard label="Monthly Expenses" value={formatInr(hub.monthly_expenses)} icon={TrendingDown} color="bg-amber-500" />
        <KpiCard label="Net Profit" value={formatInr(hub.net_profit)} icon={IndianRupee} color="bg-teal-600" sub={`GST Payable: ${formatInr(hub.gst_payable)}`} />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {FINANCE_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < FINANCE_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Cash Flow Trend" data={hub.cash_flow_trend} lines={[{ key: "inflow", color: "#22c55e", name: "Inflow" }, { key: "outflow", color: "#ef4444", name: "Outflow" }]} />
        <ChartCard title="Revenue Trend" data={hub.revenue_trend} lines={[{ key: "amount", color: "#2563EB", name: "Revenue" }]} />
        <ChartCard title="Expense Trend" data={hub.expense_trend} lines={[{ key: "amount", color: "#f59e0b", name: "Expenses" }]} />
        <ChartCard title="Profit Trend" data={hub.profit_trend} lines={[{ key: "amount", color: "#10b981", name: "Profit" }]} />
        <ChartCard title="GST Trend" data={hub.gst_trend} lines={[{ key: "sgst", color: "#6366f1", name: "SGST" }, { key: "cgst", color: "#8b5cf6", name: "CGST" }, { key: "igst", color: "#ec4899", name: "IGST" }]} />
        <ChartCard title="Vendor Payments" data={hub.vendor_payments} lines={[{ key: "amount", color: "#ef4444", name: "Paid" }]} />
        <ChartCard title="Customer Receipts" data={hub.customer_receipts} lines={[{ key: "amount", color: "#22c55e", name: "Received" }]} />
        <ChartCard title="Budget vs Actual" data={hub.budget_vs_actual} bars={[{ key: "budget", color: "#94a3b8", name: "Budget" }, { key: "actual", color: "#2563EB", name: "Actual" }]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Department Cost</h2>
          <ul className="space-y-2">
            {(hub.department_cost || []).map((d) => (
              <li key={d.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="font-semibold text-[#2563EB]">{formatInr(d.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Manufacturing Cost</h2>
          <ul className="space-y-2">
            {(hub.manufacturing_cost || []).map((d) => (
              <li key={d.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium">{d.name}</span>
                <span className="font-semibold text-[#2563EB]">{formatInr(d.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Accounts Aging</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hub.accounts_aging || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatInr(v)} />
              <Bar dataKey="amount" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
        <QuickLink to="/finance/accounts-payable" label="Accounts Payable" />
        <QuickLink to="/finance/accounts-receivable" label="Accounts Receivable" />
        <QuickLink to="/finance/payment-tracking" label="Payment Tracking" />
        <QuickLink to="/finance/general-ledger" label="General Ledger" />
        <QuickLink to="/accounts/tax-reports" label="GST Reports" />
        <QuickLink to="/accounts/profit-loss" label="Profit & Loss" />
        <QuickLink to="/accounts/balance-sheet" label="Balance Sheet" />
        <QuickLink to="/accounts/trial-balance" label="Trial Balance" />
        <QuickLink to="/accounts/journal-entries" label="Journal Entries" />
        <QuickLink to="/accounts/chart-of-accounts" label="Chart of Accounts" />
        <QuickLink to="/accounts/fixed-assets" label="Fixed Assets" />
        <QuickLink to="/accounts/bank-reconciliation" label="Bank Reconciliation" />
        <QuickLink to="/accounts/budget-actual" label="Budget vs Actual" />
        <QuickLink to="/accounts/cost-allocation" label="Cost Allocation" />
        <QuickLink to="/accounts/multi-branch-ledger" label="Multi-Branch Ledger" />
        <QuickLink to="/accounts/year-closing" label="Year Closing" />
      </div>
    </div>
  );
}

function ChartCard({ title, data, lines, bars }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          {bars ? (
            <BarChart data={data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatInr(v)} />
              <Legend />
              {bars.map((b) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={b.color} radius={[2, 2, 0, 0]} />)}
            </BarChart>
          ) : (
            <LineChart data={data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => formatInr(v)} />
              <Legend />
              {(lines || []).map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />)}
            </LineChart>
          )}
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
