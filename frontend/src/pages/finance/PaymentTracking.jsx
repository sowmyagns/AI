import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, CreditCard, IndianRupee, Plus, RefreshCw, Smartphone, XCircle } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import RecordPaymentModal from "../../components/finance/RecordPaymentModal";
import { useToast } from "../../context/ToastContext";
import { getPaymentSummary, getPaymentsEnriched } from "../../api/accountsApi";
import { DEMO_PAY_LIST, DEMO_PAY_SUMMARY, formatInr, statusColor } from "../../data/financeMasterData";

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

export default function PaymentTracking() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(DEMO_PAY_SUMMARY);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.allSettled([getPaymentSummary(), getPaymentsEnriched()]);
      if (sumRes.status === "fulfilled" && sumRes.value?.data) setSummary({ ...DEMO_PAY_SUMMARY, ...sumRes.value.data });
      const stored = localStorage.getItem("smrt_payments");
      const localPayments = stored ? JSON.parse(stored) : [];
      if (listRes.status === "fulfilled" && listRes.value?.data?.length) {
        setRows([...localPayments, ...listRes.value.data]);
      } else {
        setRows([...localPayments]);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (q && ![r.payment_number, r.invoice, r.party_name, r.utr_number, r.transaction_id].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search]);

  const columns = [
    { key: "payment_number", label: "Payment No" },
    { key: "party_name", label: "Customer/Vendor", render: (r) => (
      <span><span className="font-medium">{r.party_name}</span> <span className="text-xs text-slate-400 capitalize">({r.party_type})</span></span>
    ) },
    { key: "invoice", label: "Invoice" },
    { key: "payment_date", label: "Date", render: (r) => String(r.payment_date || "").slice(0, 10) },
    { key: "amount", label: "Amount", render: (r) => formatInr(r.amount) },
    { key: "payment_mode", label: "Payment Mode" },
    { key: "bank", label: "Bank" },
    { key: "transaction_id", label: "Transaction ID" },
    { key: "utr_number", label: "UTR Number" },
    { key: "currency", label: "Currency" },
    { key: "status", label: "Status", render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span> },
    { key: "attachment", label: "Attachment", render: (r) => r.attachment ? <span className="text-xs text-[#2563EB]">{r.attachment}</span> : "—" },
    { key: "created_by", label: "Created By" },
  ];

  if (loading) return <Loader label="Loading payment tracking..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Tracking</h1>
          <p className="mt-1 text-sm text-slate-500">Customer receipts and vendor payments — UPI, NEFT, RTGS, cash, and bank transfers.</p>
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
        <KpiCard label="Cash Received Today" value={formatInr(summary.cash_received_today)} icon={Banknote} color="bg-green-600" />
        <KpiCard label="Online Payments" value={formatInr(summary.online_payments)} icon={Smartphone} color="bg-indigo-600" />
        <KpiCard label="Cash Payments" value={formatInr(summary.cash_payments)} icon={Banknote} color="bg-teal-600" />
        <KpiCard label="Bank Transfers" value={formatInr(summary.bank_transfers)} icon={CreditCard} color="bg-blue-600" />
        <KpiCard label="Failed Payments" value={summary.failed_payments} icon={XCircle} color="bg-red-500" />
        <KpiCard label="Pending Payments" value={summary.pending_payments} icon={AlertTriangle} color="bg-amber-500" />
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
        searchPlaceholder="Search payment, UTR, party..."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <DataTable columns={columns} data={filtered} searchPlaceholder="" searchKeys={[]} />
      </div>

      <RecordPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={load}
      />
    </div>
  );
}
