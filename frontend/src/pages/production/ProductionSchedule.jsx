import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  Factory,
  GanttChart,
  LayoutGrid,
  Plus,
  RefreshCw,
  Table2,
  Users,
  X,
  Zap,
} from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import {
  getScheduleBottomKpis,
  getScheduleCalendar,
  getScheduleConflicts,
  getScheduleDashboard,
  getScheduleLiveMachines,
  getScheduleMaterials,
  getScheduleQueue,
  getScheduleShifts,
  getScheduleTimeline,
  rescheduleWorkOrder,
} from "../../api/schedulingApi";
import { getMachines, createWorkOrder, getProductionOrders } from "../../api/productionApi";
import useTenantId from "../../hooks/useTenantId";
import {
  CONFLICT_LABELS,
  DEMO_BOTTOM_KPIS,
  DEMO_DASHBOARD,
  DEMO_KANBAN,
  KANBAN_COLUMNS,
  SCHEDULE_FLOW_STEPS,
  TIMELINE_SLOTS,
  buildTableFromTimeline,
  formatScheduleDate,
  machineStatusColor,
  machineStatusDot,
  priorityBadge,
} from "../../data/productionScheduleMasterData";
import { exportToExcel } from "../../utils/exportUtils";

const VIEWS = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "table", label: "Table", icon: Table2 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ pct }) {
  const filled = Math.min(Math.max(pct || 0, 0), 100);
  const blocks = 10;
  const active = Math.round(filled / 10);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: blocks }).map((_, i) => (
          <span key={i} className={`inline-block h-3 w-3 rounded-sm ${i < active ? "bg-[#2563EB]" : "bg-slate-200"}`} />
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-700">{filled}%</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
      <ClipboardList className="mb-2 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({ rows, onDrop }) {
  const [dragWo, setDragWo] = useState(null);

  const handleDragStart = (row) => {
    if (!row.work_order_id) return;
    setDragWo(row);
  };

  const handleDrop = (targetMachineId) => {
    if (!dragWo || dragWo.machine_id === targetMachineId) return;
    onDrop(dragWo, targetMachineId);
    setDragWo(null);
  };

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmptyState message="No machines or work orders found. Add machines and create work orders to see the timeline." />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 grid min-w-[640px] grid-cols-[140px_repeat(6,1fr)] gap-1 text-center text-xs font-semibold text-slate-500">
        <div />
        {TIMELINE_SLOTS.map((s) => (
          <div key={s}>{s}</div>
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.machine_id}
            className="grid min-w-[640px] grid-cols-[140px_repeat(6,1fr)] items-center gap-1"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(row.machine_id)}
          >
            <div className="pr-2 text-sm font-semibold text-slate-800 truncate">{row.machine_name}</div>
            <div className="col-span-6 relative h-10 rounded-lg bg-slate-50">
              {row.span_slots > 0 && (
                <div
                  draggable={!!row.work_order_id}
                  onDragStart={() => handleDragStart(row)}
                  className={`absolute inset-y-1 flex items-center rounded-md px-2 text-xs font-semibold text-white shadow-sm ${
                    row.status === "maintenance"
                      ? "bg-slate-500 cursor-default"
                      : row.status === "running"
                        ? "bg-[#2563EB] cursor-grab active:cursor-grabbing"
                        : "bg-amber-500 cursor-grab active:cursor-grabbing"
                  }`}
                  style={{
                    left: `${(row.start_slot / 6) * 100}%`,
                    width: `${(row.span_slots / 6) * 100}%`,
                  }}
                  title={row.work_order_id ? "Drag to reschedule on another machine" : undefined}
                >
                  <span className="truncate">{row.job_label}</span>
                </div>
              )}
              {row.span_slots === 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  {row.job_label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Drag a job block onto another machine row to reschedule. Conflicts are checked automatically.
      </p>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({ events }) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const statusColor = {
    in_progress: "bg-green-100 border-green-400 text-green-800",
    running: "bg-green-100 border-green-400 text-green-800",
    planned: "bg-blue-100 border-blue-400 text-blue-800",
    completed: "bg-slate-100 border-slate-400 text-slate-700",
    cancelled: "bg-red-100 border-red-400 text-red-700",
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Weekly Production Calendar</h3>
        <p className="text-xs text-slate-500">
          {startOfWeek.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} —{" "}
          {days[6].toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </div>
      {events.length === 0 ? (
        <EmptyState message="No production orders scheduled this week. Create a production order with start and due dates." />
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, di) => (
            <div key={di} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center text-xs font-semibold text-slate-600">
              {dayNames[di]} {d.getDate()}
            </div>
          ))}
          {days.map((d, di) => {
            const dayEvents = events.filter((e) => {
              const start = e.start ? new Date(e.start) : null;
              const end = e.end ? new Date(e.end) : start;
              if (!start) return false;
              return d >= new Date(start.toDateString()) && d <= new Date((end || start).toDateString());
            });
            return (
              <div key={`cell-${di}`} className="min-h-[100px] rounded-lg border border-slate-100 p-2">
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`mb-1 rounded border px-1.5 py-1 text-[10px] font-medium ${statusColor[e.status] || statusColor.planned}`}
                  >
                    {e.product}
                    <span className="block text-[9px] opacity-70">{e.planned_quantity} units</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ items }) {
  const hasAny = Object.values(items).some((arr) => arr.length > 0);
  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <EmptyState message="No work orders to display. Create work orders to populate the Kanban board." />
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {KANBAN_COLUMNS.map((col) => (
        <div key={col.id} className={`rounded-2xl border-2 p-3 ${col.color}`}>
          <h4 className="mb-3 text-sm font-bold text-slate-800">
            {col.label}
            <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs text-slate-500">
              {(items[col.id] || []).length}
            </span>
          </h4>
          <div className="space-y-2">
            {(items[col.id] || []).length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">Empty</p>
            ) : (
              (items[col.id] || []).map((card) => (
                <div key={card.id} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                  <p className="text-xs font-bold text-slate-800">{card.work_order_number}</p>
                  <p className="text-sm text-slate-700">{card.product_name}</p>
                  <p className="text-xs text-slate-500">{card.quantity} Qty · {card.machine_name}</p>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityBadge(card.priority).bg} ${priorityBadge(card.priority).text}`}>
                    {priorityBadge(card.priority).label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── New Schedule Modal ───────────────────────────────────────────────────────

function NewScheduleModal({ onClose, onSuccess }) {
  const tenantId = useTenantId();
  const { addToast } = useToast();
  const [productionOrders, setProductionOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    production_order_id: "",
    machine_id: "",
    planned_start: "",
    planned_end: "",
    shift: "Morning",
    priority: "medium",
  });

  useEffect(() => {
    Promise.all([
      getProductionOrders().catch(() => ({ data: [] })),
      getMachines().catch(() => ({ data: [] })),
    ]).then(([poRes, mRes]) => {
      // Only show planned/in_progress orders that don't have a work order yet
      const orders = (poRes.data || []).filter((o) => ["planned", "in_progress"].includes(o.status));
      setProductionOrders(orders);
      setMachines(mRes.data || []);
    }).finally(() => setLoading(false));
  }, [tenantId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.production_order_id) {
      addToast("Please select a production order", "error");
      return;
    }
    setSaving(true);
    try {
      // Find the production order details
      const po = productionOrders.find((o) => String(o.id) === String(form.production_order_id));
      const res = await createWorkOrder({
        production_order_id: Number(form.production_order_id),
        machine_id: form.machine_id ? Number(form.machine_id) : null,
        planned_start: form.planned_start || null,
        planned_end: form.planned_end || null,
        shift: form.shift || null,
        priority: form.priority,
        planned_quantity: po?.planned_quantity || 1,
        status: "planned",
        tenant_id: tenantId,
      });
      if (res?.data) {
        addToast("Schedule created successfully!", "success");
        onSuccess();
        onClose();
      }
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to create schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">New Schedule</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Production Order <span className="text-red-500">*</span>
              </label>
              <select
                name="production_order_id"
                value={form.production_order_id}
                onChange={handleChange}
                required
                className={inputCls}
              >
                <option value="">— Select production order —</option>
                {productionOrders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} — {o.product_name || o.product?.name || "Product"} ({o.planned_quantity} qty)
                  </option>
                ))}
              </select>
              {productionOrders.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No active production orders found. Create a production order first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Machine</label>
              <select name="machine_id" value={form.machine_id} onChange={handleChange} className={inputCls}>
                <option value="">— Unassigned —</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Planned Start</label>
                <input type="datetime-local" name="planned_start" value={form.planned_start} onChange={handleChange} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Planned End</label>
                <input type="datetime-local" name="planned_end" value={form.planned_end} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Shift</label>
                <select name="shift" value={form.shift} onChange={handleChange} className={inputCls}>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange} className={inputCls}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || productionOrders.length === 0}
                className="flex-1 rounded-lg bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d3d6a] disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create Schedule"}
              </button>
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductionSchedule() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("timeline");
  const [dashboard, setDashboard] = useState(DEMO_DASHBOARD);
  const [timeline, setTimeline] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [liveMachines, setLiveMachines] = useState([]);
  const [queue, setQueue] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [bottomKpis, setBottomKpis] = useState(DEMO_BOTTOM_KPIS);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [kanban, setKanban] = useState(DEMO_KANBAN);
  const [tableSearch, setTableSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashRes, timelineRes, shiftRes, liveRes, queueRes,
        matRes, conflictRes, bottomRes, calRes,
      ] = await Promise.allSettled([
        getScheduleDashboard(),
        getScheduleTimeline(),
        getScheduleShifts(),
        getScheduleLiveMachines(),
        getScheduleQueue(),
        getScheduleMaterials(),
        getScheduleConflicts(),
        getScheduleBottomKpis(),
        getScheduleCalendar(),
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value?.data) {
        setDashboard({ ...DEMO_DASHBOARD, ...dashRes.value.data });
      }
      if (timelineRes.status === "fulfilled" && Array.isArray(timelineRes.value?.data)) {
        setTimeline(timelineRes.value.data);
      }
      if (shiftRes.status === "fulfilled" && Array.isArray(shiftRes.value?.data)) {
        setShifts(shiftRes.value.data);
      }
      if (liveRes.status === "fulfilled" && Array.isArray(liveRes.value?.data)) {
        setLiveMachines(liveRes.value.data);
      }
      if (queueRes.status === "fulfilled" && Array.isArray(queueRes.value?.data)) {
        setQueue(queueRes.value.data);
      }
      if (matRes.status === "fulfilled" && Array.isArray(matRes.value?.data)) {
        setMaterials(matRes.value.data);
      }
      if (conflictRes.status === "fulfilled" && Array.isArray(conflictRes.value?.data)) {
        setConflicts(conflictRes.value.data);
      }
      if (bottomRes.status === "fulfilled" && bottomRes.value?.data) {
        setBottomKpis({ ...DEMO_BOTTOM_KPIS, ...bottomRes.value.data });
      }
      if (calRes.status === "fulfilled" && Array.isArray(calRes.value?.data)) {
        setCalendarEvents(calRes.value.data);
      }
      // Build Kanban from work orders in timeline
      if (timelineRes.status === "fulfilled" && Array.isArray(timelineRes.value?.data)) {
        const rows = timelineRes.value.data;
        const kb = { planned: [], ready: [], running: [], quality: [], completed: [] };
        rows.forEach((r) => {
          const status = r.status === "in_progress" ? "running" : r.status;
          if (kb[status]) {
            kb[status].push({
              id: r.work_order_id || `m-${r.machine_id}`,
              work_order_number: r.work_order_number || "—",
              product_name: r.job_label || r.machine_name,
              quantity: 0,
              machine_name: r.machine_name,
              priority: r.priority || "medium",
            });
          }
        });
        setKanban(kb);
      }
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tableRows = useMemo(
    () => buildTableFromTimeline(timeline, shifts),
    [timeline, shifts]
  );

  const filteredTable = useMemo(() => {
    if (!tableSearch.trim()) return tableRows;
    const q = tableSearch.toLowerCase();
    return tableRows.filter((r) =>
      [r.work_order_number, r.product_name, r.machine_name, r.operator_name, r.status]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
  }, [tableRows, tableSearch]);

  const handleReschedule = async (sourceRow, targetMachineId) => {
    const targetRow = timeline.find((r) => r.machine_id === targetMachineId);
    if (!targetRow || targetRow.status === "maintenance") {
      addToast("Cannot schedule on maintenance machine", "error");
      return;
    }
    if (typeof sourceRow.work_order_id === "number" && typeof targetMachineId === "number") {
      try {
        const res = await rescheduleWorkOrder({
          work_order_id: sourceRow.work_order_id,
          machine_id: targetMachineId,
          start_slot: 0,
        });
        if (res.data?.success) {
          addToast(res.data.message, "success");
          load();
          return;
        }
        addToast(res.data?.message || "Reschedule blocked", "error");
        return;
      } catch {
        addToast("Reschedule failed", "error");
        return;
      }
    }
    // Local fallback
    setTimeline((prev) =>
      prev.map((r) => {
        if (r.machine_id === sourceRow.machine_id)
          return { ...r, job_label: "Idle", work_order_id: null, span_slots: 0, status: "idle" };
        if (r.machine_id === targetMachineId)
          return { ...r, job_label: sourceRow.job_label, work_order_id: sourceRow.work_order_id, span_slots: sourceRow.span_slots || 2, start_slot: 0, status: "planned" };
        return r;
      })
    );
    addToast(`Moved ${sourceRow.job_label} to ${targetRow?.machine_name}`, "success");
  };

  const tableColumns = [
    { key: "schedule_id", label: "Schedule ID" },
    { key: "work_order_number", label: "Work Order" },
    { key: "product_name", label: "Product" },
    { key: "machine_name", label: "Machine" },
    { key: "operator_name", label: "Operator" },
    { key: "shift", label: "Shift" },
    { key: "start", label: "Start" },
    { key: "end", label: "End" },
    { key: "quantity", label: "Qty" },
    {
      key: "priority",
      label: "Priority",
      render: (row) => {
        const p = priorityBadge(row.priority);
        return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.bg} ${p.text}`}>{p.label}</span>;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${machineStatusColor(row.status)}`}>
          {row.status}
        </span>
      ),
    },
  ];

  const handleExport = () => {
    const exportCols = tableColumns.filter((c) => !c.render);
    const data = filteredTable.length ? filteredTable : tableRows;
    exportToExcel(data, exportCols, "production-schedule");
    addToast("Schedule exported to Excel", "success");
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Production Schedule</h1>
          <p className="mt-1 text-sm text-slate-500">
            Calendar, Gantt timeline, Kanban, and machine-wise scheduling control center.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d3d6a]"
          >
            <Plus className="h-4 w-4" /> New Schedule
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      {/* Today badge */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
        <span className="font-semibold">Today:</span> {formatScheduleDate(dashboard.today)}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        <SummaryCard label="Production Target" value={(dashboard.production_target ?? 0).toLocaleString()} icon={Factory} color="bg-[#2563EB]" />
        <SummaryCard label="Completed" value={(dashboard.completed ?? 0).toLocaleString()} icon={CheckCircle2} color="bg-green-500" />
        <SummaryCard label="Pending" value={(dashboard.pending ?? 0).toLocaleString()} icon={ClipboardList} color="bg-amber-500" />
        <SummaryCard label="Overall Progress" value={<ProgressBar pct={dashboard.overall_progress_pct} />} color="bg-indigo-500" />
        <SummaryCard label="Machine Utilization" value={`${dashboard.machine_utilization_pct ?? 0}%`} icon={Zap} color="bg-teal-500" />
        <SummaryCard label="Operators Present" value={dashboard.operators_present ?? 0} icon={Users} color="bg-blue-500" />
        <SummaryCard label="Delayed Orders" value={dashboard.delayed_orders ?? 0} icon={AlertTriangle} color="bg-red-500" />
        <SummaryCard label="Material Shortage" value={dashboard.material_shortage ?? 0} icon={AlertTriangle} color="bg-orange-500" />
      </div>

      {/* View tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
        {VIEWS.map((v) => {
          const Icon = v.icon;
          const active = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-[#2563EB] text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" /> {v.label}
            </button>
          );
        })}
      </div>

      {/* Main content + right sidebar */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          {view === "timeline" && <TimelineView rows={timeline} onDrop={handleReschedule} />}
          {view === "calendar" && <CalendarView events={calendarEvents} />}
          {view === "kanban" && <KanbanView items={kanban} />}
          {view === "table" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                type="search"
                placeholder="Search schedules…"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              {filteredTable.length === 0 ? (
                <EmptyState message="No schedule data found. Create work orders and assign them to machines." />
              ) : (
                <DataTable
                  columns={tableColumns}
                  data={filteredTable}
                  searchKeys={["work_order_number", "product_name", "machine_name"]}
                  showSearch={false}
                />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-4">
          {/* Shift Schedule */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-800">Shift Schedule</h3>
            {shifts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No active shifts. Assign shifts to work orders.</p>
            ) : (
              <div className="space-y-3">
                {shifts.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                    <p className="font-bold text-slate-800">{s.shift_name}</p>
                    <p className="text-slate-600">{s.machine_name} · {s.operator_name}</p>
                    <p className="text-slate-700">{s.product_name} — {s.quantity} Qty</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 font-semibold capitalize ${machineStatusColor(s.status)}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live Machine Status */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-800">Live Machine Status</h3>
            {liveMachines.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No machines found. Add machines in Masters.</p>
            ) : (
              <div className="space-y-2">
                {liveMachines.map((m) => (
                  <div key={m.machine_id} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-sm font-bold text-slate-800">
                      {machineStatusDot(m.status)} {m.machine_name}
                    </p>
                    <p className="text-xs capitalize text-slate-600">{m.status}</p>
                    {m.job && <p className="text-xs text-slate-500">Job: {m.job}</p>}
                    {m.progress_pct > 0 && (
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full bg-green-500 transition-all" style={{ width: `${m.progress_pct}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Production Queue */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-800">Production Queue</h3>
            {queue.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Queue is empty. Planned work orders will appear here.</p>
            ) : (
              <ol className="space-y-2">
                {queue.map((q) => (
                  <li key={q.position} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 text-xs">
                    <span className="font-bold text-[#2563EB]">{q.position}.</span>
                    <div>
                      <p className="font-semibold text-slate-800">{q.product_name}</p>
                      <p className="text-slate-600">{q.quantity} Qty</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityBadge(q.priority).bg} ${priorityBadge(q.priority).text}`}>
                        Priority: {priorityBadge(q.priority).label}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Material Availability */}
          {materials.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-slate-800">Material Availability</h3>
              <ul className="space-y-2 text-sm">
                {materials.map((m) => (
                  <li key={m.product_name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <span className="font-medium text-slate-800">{m.product_name}</span>
                    <span className={m.available ? "text-green-600" : "text-amber-600"}>
                      {m.available ? "✔ Issued" : "⚠ Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Schedule Conflicts */}
          {conflicts.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-bold text-amber-900">Schedule Conflicts</h3>
              <ul className="space-y-2 text-xs">
                {conflicts.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{CONFLICT_LABELS[c.conflict_type] || c.conflict_type}</p>
                      <p className="text-amber-800">{c.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {/* Bottom KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <SummaryCard label="Today's Production" value={(bottomKpis.todays_production ?? 0).toLocaleString()} />
        <SummaryCard label="Pending Orders" value={(bottomKpis.pending_orders ?? 0).toLocaleString()} />
        <SummaryCard label="Machine Efficiency" value={`${bottomKpis.machine_efficiency_pct ?? 0}%`} />
        <SummaryCard label="Shift Efficiency" value={`${bottomKpis.shift_efficiency_pct ?? 0}%`} />
        <SummaryCard label="Downtime" value={`${bottomKpis.downtime_minutes ?? 0} min`} />
        <SummaryCard label="Power Consumption" value={`${bottomKpis.power_kwh ?? 0} kWh`} />
        <SummaryCard label="OEE" value={`${bottomKpis.oee_pct ?? 0}%`} />
        <SummaryCard label="Quality Rate" value={`${bottomKpis.quality_rate_pct ?? 0}%`} />
      </div>

      {/* Workflow bar */}
      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 px-4 py-3">
        {SCHEDULE_FLOW_STEPS.map((step, i) => (
          <span key={step} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-[#2563EB]">{step}</span>
            {i < SCHEDULE_FLOW_STEPS.length - 1 && <span className="text-slate-300">→</span>}
          </span>
        ))}
      </div>

      {/* New Schedule modal */}
      {showNewModal && (
        <NewScheduleModal
          onClose={() => setShowNewModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
