import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Layers, Shield, RefreshCw, X } from "lucide-react";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getExtendedReports, createGLAccount } from "../../api/accountsApi";
import { formatInr } from "../../data/financeMasterData";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

export default function ChartOfAccounts() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [financialYear, setFinancialYear] = useState("2026-27");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Assets");
  const [accounts, setAccounts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExtendedReports(financialYear, month, branch);
      if (res.data && res.data.trial_balance_accounts) {
        // Map trial balance accounts back into COA listings
        const mapped = res.data.trial_balance_accounts.map((tb) => ({
          code: tb.code,
          name: tb.name,
          parent: tb.category === "Asset" ? "Current Assets" : tb.category === "Liability" ? "Current Liabilities" : "Operating Cost",
          type: tb.category === "Asset" ? "Assets" : tb.category === "Liability" ? "Liabilities" : tb.category === "Revenue" ? "Revenue" : "Expenses",
          balance: tb.debit > 0 ? tb.debit : -tb.credit,
          status: "Active"
        }));
        setAccounts(mapped);
      }
    } catch {
      addToast("Failed to load Chart of Accounts data", "error");
    } finally {
      setLoading(false);
    }
  }, [financialYear, month, branch, addToast]);

  useEffect(() => { load(); }, [load]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({
    code: "",
    name: "",
    parent: "Current Assets",
    type: "Assets",
    balance: 0,
    status: "Active"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createGLAccount(newAcc);
      if (res.data && res.data.status === "error") {
        addToast(res.data.message || "Failed to create account", "error");
        setLoading(false);
        return;
      }
      addToast("GL Account added successfully!", "success");
      setModalOpen(false);
      setNewAcc({
        code: "",
        name: "",
        parent: "Current Assets",
        type: "Assets",
        balance: 0,
        status: "Active"
      });
      load();
    } catch {
      addToast("Failed to create GL Account", "error");
      setLoading(false);
    }
  };

  const tabs = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"];

  const filtered = accounts.filter((a) => {
    if (a.type !== activeTab) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.code.includes(search)) return false;
    return true;
  });

  if (loading) return <Loader label="Loading Chart of Accounts..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 border-b-0 pb-0">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">Configure and manage General Ledger account structure codes and classifications.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      <FinanceFilters
        search={search}
        onSearchChange={setSearch}
        financialYear={financialYear}
        onFinancialYearChange={setFinancialYear}
        month={month}
        onMonthChange={setMonth}
        branch={branch}
        onBranchChange={setBranch}
        searchPlaceholder="Search accounts by name or code..."
      />

      <div className="flex border-b border-slate-200 bg-slate-50/50 rounded-t-xl p-1.5 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === tab
                ? "bg-white text-[#2563EB] shadow-sm font-bold border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-b-2xl border border-t-0 border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 text-left font-semibold">
                <th className="p-3">Account Code</th>
                <th className="p-3">Account Name</th>
                <th className="p-3">Parent Group</th>
                <th className="p-3">Class Type</th>
                <th className="p-3 text-right">Current balance</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => (
                <tr key={a.code} className="hover:bg-slate-50/50">
                  <td className="p-3 font-semibold text-slate-700">{a.code}</td>
                  <td className="p-3 text-slate-900 font-medium">{a.name}</td>
                  <td className="p-3 text-slate-600">{a.parent}</td>
                  <td className="p-3 text-slate-500">{a.type}</td>
                  <td className="p-3 text-right text-slate-800 font-bold tabular-nums">{formatInr(a.balance)}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-slate-400">
                    No ledger structures registered under {activeTab} group
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New GL Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define a General Ledger account entry in the chart of accounts.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1005"
                    value={newAcc.code}
                    onChange={(e) => setNewAcc((prev) => ({ ...prev, code: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Account Class</label>
                  <select
                    value={newAcc.type}
                    onChange={(e) => setNewAcc((prev) => ({ ...prev, type: e.target.value }))}
                    className={inputClass}
                  >
                    {tabs.map((tab) => <option key={tab} value={tab}>{tab}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Account Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty Cash Account"
                  value={newAcc.name}
                  onChange={(e) => setNewAcc((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Group *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Current Assets"
                    value={newAcc.parent}
                    onChange={(e) => setNewAcc((prev) => ({ ...prev, parent: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newAcc.balance || ""}
                    onChange={(e) => setNewAcc((prev) => ({ ...prev, balance: e.target.value }))}
                    className={`${inputClass} text-right`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
