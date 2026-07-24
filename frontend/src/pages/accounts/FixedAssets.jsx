import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Layers, Calculator, ShieldAlert, Award, FileText, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import FinanceFilters from "../../components/finance/FinanceFilters";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import { getExtendedReports, createFixedAsset } from "../../api/accountsApi";
import { formatInr } from "../../data/financeMasterData";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all";

export default function FixedAssets() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [financialYear, setFinancialYear] = useState("2026-27");
  const [month, setMonth] = useState("All Months");
  const [branch, setBranch] = useState("");
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getExtendedReports(financialYear, month, branch);
      if (res.data && res.data.fixed_assets) {
        setAssets(res.data.fixed_assets);
      }
    } catch {
      addToast("Failed to load Fixed Assets data", "error");
    } finally {
      setLoading(false);
    }
  }, [financialYear, month, branch, addToast]);

  useEffect(() => { load(); }, [load]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    code: "",
    name: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    cost: "",
    salvage: "",
    life: "",
    method: "Straight Line"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createFixedAsset(newAsset);
      if (res.data && res.data.status === "error") {
        addToast(res.data.message || "Failed to register asset", "error");
        setLoading(false);
        return;
      }
      addToast("Fixed Asset registered successfully!", "success");
      setModalOpen(false);
      setNewAsset({
        code: "",
        name: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        cost: "",
        salvage: "",
        life: "",
        method: "Straight Line"
      });
      load();
    } catch {
      addToast("Failed to register Fixed Asset", "error");
      setLoading(false);
    }
  };

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = filtered.reduce((s, a) => s + a.cost, 0);
  const totalDep = filtered.reduce((s, a) => s + a.accumDep, 0);
  const netValue = totalCost - totalDep;

  const forecastData = [
    { year: "2026-27", value: netValue },
    { year: "2027-28", value: netValue * 0.88 },
    { year: "2028-29", value: netValue * 0.77 },
    { year: "2029-30", value: netValue * 0.68 },
    { year: "2030-31", value: netValue * 0.60 },
  ];

  if (loading) return <Loader label="Loading Fixed Assets..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 border-b-0 pb-0">Fixed Assets & Depreciation</h1>
          <p className="mt-1 text-sm text-slate-500">Track company capitalizations, useful lives, accumulated depreciation, and asset schedules.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            Register Asset
          </button>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Gross Block" value={formatInr(totalCost)} icon={Layers} color="bg-blue-600" />
        <KpiCard label="Accumulated Depreciation" value={formatInr(totalDep)} icon={Calculator} color="bg-red-500" />
        <KpiCard label="Net Book Value" value={formatInr(netValue)} icon={Award} color="bg-green-600" />
        <KpiCard label="Current Month Depreciation" value={formatInr(totalCost * 0.008)} icon={ShieldAlert} color="bg-indigo-600" />
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
        searchPlaceholder="Search fixed assets..."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50/50">
            <h2 className="font-bold text-slate-800">Capital Fixed Assets Schedule</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 text-left font-semibold">
                  <th className="p-3">Asset Code</th>
                  <th className="p-3">Asset Description</th>
                  <th className="p-3">Purchased</th>
                  <th className="p-3 text-right">Cost (₹)</th>
                  <th className="p-3 text-right">Accum Dep (₹)</th>
                  <th className="p-3 text-right">Net Value (₹)</th>
                  <th className="p-3 text-center">Life</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((a) => (
                  <tr key={a.code} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-700">{a.code}</td>
                    <td className="p-3 text-slate-900 font-medium">
                      <div>{a.name}</div>
                      <div className="text-[11px] text-slate-400">Method: {a.method} | Salvage: {formatInr(a.salvage)}</div>
                    </td>
                    <td className="p-3 text-slate-600">{a.purchaseDate}</td>
                    <td className="p-3 text-right text-slate-800 font-bold tabular-nums">{formatInr(a.cost)}</td>
                    <td className="p-3 text-right text-slate-800 font-bold tabular-nums">{formatInr(a.accumDep)}</td>
                    <td className="p-3 text-right text-green-700 font-bold tabular-nums">{formatInr(a.cost - a.accumDep)}</td>
                    <td className="p-3 text-center text-slate-600 font-semibold">{a.life} yrs</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-6 text-slate-400">
                      No capitalized assets recorded for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Depreciation Net Value Projection</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(v) => formatInr(v)} />
                <Tooltip formatter={(v) => formatInr(v)} />
                <Area type="monotone" dataKey="value" stroke="#4F46E5" fill="#EEF2F6" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Register Asset Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Register Fixed Asset</h3>
                <p className="text-xs text-slate-500 mt-0.5">Capitalize capital assets, plant machinery, and office property.</p>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FA-004"
                    value={newAsset.code}
                    onChange={(e) => setNewAsset((prev) => ({ ...prev, code: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={newAsset.purchaseDate}
                    onChange={(e) => setNewAsset((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laser engraving machine"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Capital Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="450000"
                    value={newAsset.cost}
                    onChange={(e) => setNewAsset((prev) => ({ ...prev, cost: e.target.value }))}
                    className={`${inputClass} text-right`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Salvage Value (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={newAsset.salvage}
                    onChange={(e) => setNewAsset((prev) => ({ ...prev, salvage: e.target.value }))}
                    className={`${inputClass} text-right`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Useful Life (Yrs) *</label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={newAsset.life}
                    onChange={(e) => setNewAsset((prev) => ({ ...prev, life: e.target.value }))}
                    className={`${inputClass} text-center`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Depreciation Method</label>
                <select
                  value={newAsset.method}
                  onChange={(e) => setNewAsset((prev) => ({ ...prev, method: e.target.value }))}
                  className={inputClass}
                >
                  <option value="Straight Line">Straight Line</option>
                  <option value="WDV (15%)">WDV (15%)</option>
                  <option value="Double Declining">Double Declining Balance</option>
                </select>
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
                  Capitalize Asset
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
