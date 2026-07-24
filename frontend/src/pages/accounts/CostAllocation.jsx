import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Layers, Award, ShieldAlert, X } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getExtendedReports } from "../../api/accountsApi";
import { formatInr } from "../../data/financeMasterData";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

export default function CostAllocation() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [financialYear, setFinancialYear] = useState("2026-27");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [search, setSearch] = useState("");
  const [allocations, setAllocations] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExtendedReports(financialYear, month, branch);
      if (res.data && res.data.cost_allocations) {
        setAllocations(res.data.cost_allocations);
      }
    } catch {
      addToast("Failed to load Cost Center Allocation data", "error");
    } finally {
      setLoading(false);
    }
  }, [financialYear, month, branch, addToast]);

  useEffect(() => { load(); }, [load]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newAlloc, setNewAlloc] = useState({
    expense: "",
    ratio: "",
    dept: "Production",
    amount: "",
    date: new Date().toISOString().split("T")[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setAllocations((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        expense: newAlloc.expense,
        ratio: Number(newAlloc.ratio),
        dept: newAlloc.dept,
        amount: Number(newAlloc.amount),
        date: newAlloc.date
      }
    ]);
    setModalOpen(false);
    setNewAlloc({
      expense: "",
      ratio: "",
      dept: "Production",
      amount: "",
      date: new Date().toISOString().split("T")[0]
    });
  };

  const filtered = allocations.filter((a) =>
    a.expense.toLowerCase().includes(search.toLowerCase()) ||
    a.dept.toLowerCase().includes(search.toLowerCase())
  );

  const totalAllocated = filtered.reduce((s, a) => s + a.amount, 0);

  const deptSummary = filtered.reduce((acc, curr) => {
    const existing = acc.find((item) => item.name === curr.dept);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.dept, value: curr.amount });
    }
    return acc;
  }, []);

  const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#8B5CF6"];

  if (loading) return <Loader label="Loading Cost Allocations..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 border-b-0 pb-0">Cost Center Allocation</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Allocate indirect overhead and general expense vouchers across organizational departments.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            New Allocation
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Allocated Overhead" value={formatInr(totalAllocated)} icon={Layers} color="bg-blue-600" />
        <KpiCard label="Production cost Center Share" value={formatInr(filtered.filter((a) => a.dept === "Production").reduce((s, a) => s + a.amount, 0))} icon={Award} color="bg-green-600" />
        <KpiCard label="General overhead Cost Center" value={formatInr(filtered.filter((a) => a.dept !== "Production").reduce((s, a) => s + a.amount, 0))} icon={ShieldAlert} color="bg-amber-50" />
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
        searchPlaceholder="Search overhead expenses..."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Direct Overhead Posting Ledger</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 text-left font-semibold">
                  <th className="p-3">Posting Date</th>
                  <th className="p-3">Expense Voucher Item</th>
                  <th className="p-3">Allocated Center</th>
                  <th className="p-3 text-center">Ratio (%)</th>
                  <th className="p-3 text-right">Allocated Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-600">{a.date}</td>
                    <td className="p-3 text-slate-900 font-semibold">{a.expense}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        {a.dept}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-600 font-semibold">{a.ratio}%</td>
                    <td className="p-3 text-right text-slate-900 font-bold tabular-nums">{formatInr(a.amount)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-6 text-slate-400">
                      No cost allocations found for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Cost Center Distribution</h2>
          <div className="h-64">
            {deptSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptSummary} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                    {deptSummary.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatInr(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-400">No department cost allocation logs</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Allocation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Cost Allocation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Distribute overhead costs and expenses to operational cost centers.</p>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Posting Date *</label>
                  <input
                    type="date"
                    required
                    value={newAlloc.date}
                    onChange={(e) => setNewAlloc((prev) => ({ ...prev, date: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Allocated Center *</label>
                  <select
                    value={newAlloc.dept}
                    onChange={(e) => setNewAlloc((prev) => ({ ...prev, dept: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="Production">Production</option>
                    <option value="R&D">R&D</option>
                    <option value="Admin">Admin</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Expense Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Headquarters High-Speed Broadband Bill"
                  value={newAlloc.expense}
                  onChange={(e) => setNewAlloc((prev) => ({ ...prev, expense: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Overhead Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={newAlloc.amount}
                    onChange={(e) => setNewAlloc((prev) => ({ ...prev, amount: e.target.value }))}
                    className={`${inputClass} text-right`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Allocation Share (%) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50"
                    value={newAlloc.ratio}
                    onChange={(e) => setNewAlloc((prev) => ({ ...prev, ratio: e.target.value }))}
                    className={`${inputClass} text-center`}
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
                  Allocate Cost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
