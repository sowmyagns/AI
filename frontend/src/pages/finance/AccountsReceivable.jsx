import { useCallback, useEffect, useMemo, useState } from "react";
import { IndianRupee, Plus, RefreshCw, TrendingDown, Users, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import DataTable from "../../components/common/DataTable";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import RecordPaymentModal from "../../components/finance/RecordPaymentModal";
import { useToast } from "../../context/ToastContext";
import { getAREnriched, getARSummary } from "../../api/accountsApi";
import { DEMO_AR_LIST, DEMO_AR_SUMMARY, formatInr, statusColor, agingColor } from "../../data/financeMasterData";

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

export default function AccountsReceivable() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_AR_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getARSummary(), getAREnriched()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary({ ...DEMO_AR_SUMMARY, ...sumRes.value.data });
      if (listRes.status === "fulfilled" && listRes.value?.data?.length) setRows(listRes.value.data);
      else setRows([]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const agingData = [
    { bucket: "0–30 Days", amount: summary.aging_0_30 },
    { bucket: "31–60 Days", amount: summary.aging_31_60 },
    { bucket: "61–90 Days", amount: summary.aging_61_90 },
    { bucket: "90+ Days", amount: summary.aging_90_plus },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.invoice_number, r.customer_name].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search]);

  const columns = [
    { key: "invoice_number", label: "Invoice No" },
    { key: "customer_name", label: "Customer" },
    { key: "issue_date", label: "Invoice Date", render: (r) => String(r.issue_date || "").slice(0, 10) },
    { key: "due_date", label: "Due Date", render: (r) => String(r.due_date || "").slice(0, 10) },
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount) },
    { key: "paid", label: "Paid", render: (r) => formatInr(r.paid) },
    { key: "balance", label: "Balance", render: (r) => formatInr(r.balance) },
    { key: "days_overdue", label: "Days Overdue" },
    { key: "aging_bucket", label: "Aging", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${agingColor(r.aging_bucket)}`}>{r.aging_bucket} days</span> },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span> },
    {
      key: "actions",
      label: "Actions",
      render: () => (
        <button
          type="button"
          onClick={() => setShowPaymentModal(true)}
          className="text-xs font-semibold text-[#2563EB] hover:underline"
        >
          Record Collection
        </button>
      ),
    },
  ];

  if (loading) return <Loader label="Loading accounts receivable..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Receivable</h1>
          <p className="mt-1 text-sm text-slate-500">Customer invoices, collections, and aging analysis for finance team.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Record Collection
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Receivables" value={formatInr(summary.total_receivables)} icon={IndianRupee} color="bg-blue-600" />
        <KpiCard label="Received Today" value={formatInr(summary.received_today)} icon={Wallet} color="bg-green-600" />
        <KpiCard label="Overdue" value={formatInr(summary.overdue)} icon={TrendingDown} color="bg-red-500" />
        <KpiCard label="Pending Collection" value={formatInr(summary.pending_collection)} icon={IndianRupee} color="bg-amber-500" />
        <KpiCard label="Credit Customers" value={summary.credit_customers} icon={Users} color="bg-indigo-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Customer Aging Report</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {agingData.map((a) => (
            <div key={a.bucket} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs font-medium text-slate-500">{a.bucket}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{formatInr(a.amount)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatInr(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatInr(v)} />
              <Legend />
              <Bar dataKey="amount" name="Outstanding" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <FinanceFilters
        search={search}
        onSearchChange={setSearch}
        financialYear={financialYear}
        onFinancialYearChange={setFinancialYear}
        month={month}
        onMonthChange={setMonth}
        branch={branch}
        onBranchChange={setBranch}
        searchPlaceholder="Search invoice, customer..."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        initialPartyType="Customer"
        onSuccess={load}
      />
    </div>
  );
}
