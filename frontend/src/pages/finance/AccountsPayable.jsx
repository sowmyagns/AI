import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, Clock, FileText, IndianRupee, Plus, RefreshCw } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import RecordPaymentModal from "../../components/finance/RecordPaymentModal";
import { useToast } from "../../context/ToastContext";
import { getAPEnriched, getAPSummary } from "../../api/accountsApi";
import { DEMO_AP_LIST, DEMO_AP_SUMMARY, FINANCE_FLOW, formatInr, statusColor } from "../../data/financeMasterData";

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

export default function AccountsPayable() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_AP_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getAPSummary(), getAPEnriched()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary({ ...DEMO_AP_SUMMARY, ...sumRes.value.data });
      if (listRes.status === "fulfilled" && listRes.value?.data?.length) setRows(listRes.value.data);
      else setRows([]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.bill_number, r.vendor_name, r.po_reference, r.invoice_no].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      if (branch && r.branch && r.branch !== branch) return false;
      return true;
    });
  }, [rows, search, branch]);

  const columns = [
    { key: "bill_number", label: "Bill No" },
    { key: "vendor_name", label: "Vendor" },
    { key: "po_reference", label: "PO Reference" },
    { key: "invoice_no", label: "Invoice No" },
    { key: "invoice_date", label: "Invoice Date", render: (r) => String(r.invoice_date || "").slice(0, 10) },
    { key: "due_date", label: "Due Date", render: (r) => String(r.due_date || "").slice(0, 10) },
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount) },
    { key: "gst", label: "GST", render: (r) => formatInr(r.gst) },
    { key: "paid", label: "Paid", render: (r) => formatInr(r.paid) },
    { key: "balance", label: "Balance", render: (r) => formatInr(r.balance) },
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
          Record Payment
        </button>
      ),
    },
  ];

  if (loading) return <Loader label="Loading accounts payable..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable</h1>
          <p className="mt-1 text-sm text-slate-500">Vendor bills, payment scheduling, and outstanding payables management.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" /> Record Payment
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Outstanding Payables" value={formatInr(summary.outstanding_payables)} icon={IndianRupee} color="bg-red-500" />
        <KpiCard label="Due This Week" value={summary.due_this_week} icon={Clock} color="bg-amber-500" />
        <KpiCard label="Overdue Bills" value={summary.overdue_bills} icon={AlertCircle} color="bg-orange-500" />
        <KpiCard label="Paid This Month" value={formatInr(summary.paid_this_month)} icon={IndianRupee} color="bg-green-600" />
        <KpiCard label="Pending Approvals" value={summary.pending_approvals} icon={FileText} color="bg-indigo-600" />
        <KpiCard label="Vendor Count" value={summary.vendor_count} icon={Building2} color="bg-teal-600" />
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-medium text-slate-600 sm:text-xs">
        {FINANCE_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">{s}</span>
            {i < FINANCE_FLOW.length - 1 && <span className="text-slate-400">↓</span>}
          </span>
        ))}
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
        searchPlaceholder="Search bill, vendor, PO, invoice..."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        initialPartyType="Vendor"
        onSuccess={load}
      />
    </div>
  );
}
