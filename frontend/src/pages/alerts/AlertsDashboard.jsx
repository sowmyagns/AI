import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Eye,
  Filter,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";

import Loader from "../../components/common/Loader";
import ExportButtons from "../../components/finance/ExportButtons";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import {
  acknowledgeAlert,
  createAlert,
  deleteAlert,
  getAlerts,
  resolveAlert,
} from "../../api/alertsApi";
import { isAdmin, userCanAction } from "../../config/permissions";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";
import {
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  MODULE_OPTIONS,
  SEVERITY_STYLES,
  STATUS_STYLES,
  moduleLabel,
  formatAlertDate,
  computeAlertSummary,
} from "../../utils/alertUtils";

const PAGE_SIZE = 10;

const EXPORT_COLUMNS = [
  { key: "id", label: "Alert ID" },
  { key: "title", label: "Title" },
  { key: "message", label: "Description" },
  { key: "module", label: "Module" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "assigned_to", label: "Assigned To" },
  { key: "created_by", label: "Created By" },
  { key: "created_date", label: "Created Date" },
  { key: "acknowledged_by", label: "Acknowledged By" },
  { key: "acknowledged_date", label: "Acknowledged Date" },
];

function KpiCard({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Badge({ value, styles }) {
  const key = String(value || "").toLowerCase();
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        styles[key] || "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {value || "—"}
    </span>
  );
}

function normalizeAlert(a) {
  return {
    ...a,
    module: moduleLabel(a.alert_type),
    assigned_to: a.assigned_to || "—",
    created_by: a.created_by || "—",
    created_date: formatAlertDate(a.triggered_at || a.created_at),
    acknowledged_by: a.acknowledged_by || (a.acknowledged_at ? "System" : "—"),
    acknowledged_date: formatAlertDate(a.acknowledged_at),
  };
}

export default function AlertsDashboard({ initialAlertType = null, title, subtitle }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const admin = isAdmin(user);
  const canWrite = userCanAction(user, "alerts", "update");
  const canCreate = userCanAction(user, "alerts", "create");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [module, setModule] = useState(initialAlertType || "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [assignedUser, setAssignedUser] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [sortKey, setSortKey] = useState("triggered_at");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [viewRow, setViewRow] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    alert_type: initialAlertType || "general",
    severity: "medium",
    triggered_at: new Date().toISOString().slice(0, 16),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (initialAlertType) params.alert_type = initialAlertType;
      if (initialAlertType === "low_stock") params.sync_low_stock = true;
      const res = await getAlerts(params);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setRows(data.map(normalizeAlert));
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to load alerts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [initialAlertType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (initialAlertType) setModule(initialAlertType);
  }, [initialAlertType]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (severity && String(r.severity).toLowerCase() !== severity) return false;
      if (status && String(r.status).toLowerCase() !== status) return false;
      if (module && r.alert_type !== module) return false;
      if (assignedUser && !String(r.assigned_to || "").toLowerCase().includes(assignedUser.toLowerCase())) {
        return false;
      }
      if (dateFrom) {
        const t = new Date(r.triggered_at || r.created_at).getTime();
        if (Number.isFinite(t) && t < new Date(dateFrom).getTime()) return false;
      }
      if (dateTo) {
        const t = new Date(r.triggered_at || r.created_at).getTime();
        if (Number.isFinite(t) && t > new Date(`${dateTo}T23:59:59`).getTime()) return false;
      }
      if (!q) return true;
      return [r.id, r.title, r.message, r.alert_type, r.severity, r.status]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, search, severity, status, module, assignedUser, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => computeAlertSummary(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, severity, status, module, assignedUser, dateFrom, dateTo]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const runAction = async (id, action, label) => {
    setBusyId(id);
    try {
      if (action === "ack") await acknowledgeAlert(id);
      if (action === "resolve") await resolveAlert(id);
      if (action === "delete") await deleteAlert(id);
      addToast(`${label} successful`);
      await load();
      setViewRow(null);
    } catch (e) {
      addToast(e.response?.data?.detail || `Failed to ${label.toLowerCase()}`, "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createAlert({
        ...form,
        tenant_id: user?.tenant_id ?? 1,
        triggered_at: new Date(form.triggered_at).toISOString(),
        status: "active",
      });
      addToast("Alert created");
      setShowCreate(false);
      setForm({
        title: "",
        message: "",
        alert_type: initialAlertType || "general",
        severity: "medium",
        triggered_at: new Date().toISOString().slice(0, 16),
      });
      await load();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to create alert", "error");
    }
  };

  const exportRows = sorted.map((r) => ({
    ...r,
    module: r.module,
    created_date: r.created_date,
    acknowledged_date: r.acknowledged_date,
  }));

  if (loading) return <Loader label="Loading alerts..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6 print:p-0">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title || "Alerts"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {subtitle || "Monitor, acknowledge, and resolve system alerts across modules."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <ExportButtons
            onExcel={() => exportToExcel(exportRows, EXPORT_COLUMNS, "alerts")}
            onPdf={() => exportToPdf(exportRows, EXPORT_COLUMNS, "Alerts Report", "alerts")}
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Bell className="h-4 w-4" /> New Alert
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 print:hidden">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Alerts" value={summary.total} color="text-slate-900" />
        <KpiCard label="Critical" value={summary.critical} color="text-red-600" />
        <KpiCard label="High Priority" value={summary.high} color="text-orange-600" />
        <KpiCard label="Medium Priority" value={summary.medium} color="text-yellow-600" />
        <KpiCard label="Low Priority" value={summary.low} color="text-blue-600" />
        <KpiCard label="Resolved" value={summary.resolved} color="text-green-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alerts by ID, title, description..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" /> Advanced Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={module}
              onChange={(e) => setModule(e.target.value)}
              disabled={!!initialAlertType}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              {MODULE_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              title="To date"
            />
            <input
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
              placeholder="Assigned user"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
            />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  ["id", "Alert ID"],
                  ["title", "Title"],
                  ["message", "Description"],
                  ["module", "Module"],
                  ["severity", "Severity"],
                  ["status", "Status"],
                  ["assigned_to", "Assigned To"],
                  ["created_by", "Created By"],
                  ["triggered_at", "Created Date"],
                  ["acknowledged_by", "Acknowledged By"],
                  ["acknowledged_at", "Acknowledged Date"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className="cursor-pointer whitespace-nowrap px-3 py-3 font-semibold hover:text-slate-800"
                    onClick={() => toggleSort(key)}
                  >
                    {label}
                    {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-slate-500">
                    <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No alerts match your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">#{row.id}</td>
                    <td className="max-w-[160px] truncate px-3 py-3 font-medium">{row.title}</td>
                    <td className="max-w-[200px] truncate px-3 py-3 text-slate-600">{row.message || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.module}</td>
                    <td className="px-3 py-3">
                      <Badge value={row.severity} styles={SEVERITY_STYLES} />
                    </td>
                    <td className="px-3 py-3">
                      <Badge value={row.status} styles={STATUS_STYLES} />
                    </td>
                    <td className="px-3 py-3">{row.assigned_to}</td>
                    <td className="px-3 py-3">{row.created_by}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.created_date}</td>
                    <td className="px-3 py-3">{row.acknowledged_by}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.acknowledged_date}</td>
                    <td className="px-3 py-3 print:hidden">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setViewRow(row)}
                          className="rounded-md border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="inline h-3 w-3" /> View
                        </button>
                        {canWrite && row.status === "active" && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => runAction(row.id, "ack", "Acknowledge")}
                            className="rounded-md border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        {canWrite && row.status !== "resolved" && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => runAction(row.id, "resolve", "Resolve")}
                            className="rounded-md border border-green-200 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                          >
                            Resolve
                          </button>
                        )}
                        {admin && (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => {
                              if (window.confirm("Delete this alert?")) {
                                runAction(row.id, "delete", "Delete");
                              }
                            }}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="inline h-3 w-3" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row print:hidden">
          <p className="text-xs text-slate-500">
            Showing {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{viewRow.title}</h2>
                <p className="text-sm text-slate-500">Alert #{viewRow.id}</p>
              </div>
              <button type="button" onClick={() => setViewRow(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Description</dt>
                <dd className="mt-0.5 text-slate-800">{viewRow.message || "—"}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-slate-500">Module</dt>
                  <dd>{viewRow.module}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Severity</dt>
                  <dd>
                    <Badge value={viewRow.severity} styles={SEVERITY_STYLES} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd>
                    <Badge value={viewRow.status} styles={STATUS_STYLES} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd>{viewRow.created_date}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Acknowledged</dt>
                  <dd>{viewRow.acknowledged_date}</dd>
                </div>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              {canWrite && viewRow.status === "active" && (
                <button
                  type="button"
                  onClick={() => runAction(viewRow.id, "ack", "Acknowledge")}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white"
                >
                  Acknowledge
                </button>
              )}
              {canWrite && viewRow.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => runAction(viewRow.id, "resolve", "Resolve")}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white"
                >
                  <CheckCircle2 className="h-4 w-4" /> Resolve
                </button>
              )}
              {admin && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this alert?")) runAction(viewRow.id, "delete", "Delete");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                >
                  <AlertTriangle className="h-4 w-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 print:hidden">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Create Alert</h2>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Description"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                value={form.alert_type}
                onChange={(e) => setForm({ ...form, alert_type: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {MODULE_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {SEVERITY_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                required
                value={form.triggered_at}
                onChange={(e) => setForm({ ...form, triggered_at: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
