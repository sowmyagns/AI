import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Pause,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Upload,
} from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import ProductionOrderDetailModal, {
  CompleteWorkflowModal,
  StartCheckModal,
} from "../../components/production/ProductionOrderDetailModal";
import { useToast } from "../../context/ToastContext";
import useManufacturingRefresh from "../../hooks/useManufacturingRefresh";
import {
  completeProductionOrder,
  getProductionOrderDetail,
  getProductionOrderStartChecks,
  getProductionOrders,
  getProductionPlanningSummary,
  pauseProductionOrder,
  startProductionOrder,
} from "../../api/productionApi";
import {
  DEPARTMENTS,
  IMPORT_TEMPLATE_HEADERS,
  ORDER_STATUSES,
  PRIORITIES,
  SHIFTS,
  STATUS_FLOW,
  canComplete,
  canPause,
  canStart,
  computePlanningSummary,
  enrichApiOrder,
  priorityBadge,
  statusLabel,
} from "../../data/productionPlanningMasterData";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";

function SummaryCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
        onClick ? "cursor-pointer hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function PriorityPill({ priority }) {
  const p = priorityBadge(priority || "medium");
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${p.bg} ${p.text}`}>
      {p.dot} {p.label}
    </span>
  );
}

function ProgressCell({ row }) {
  const pct = row.progress_pct ?? 0;
  return (
    <div className="min-w-[100px]">
      <div className="mb-0.5 flex justify-between text-[10px] text-slate-500 print:text-black">
        <span>{row.produced_quantity ?? 0}/{row.planned_quantity}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 print:border print:border-slate-300">
        <div className="h-full rounded-full bg-[#2563EB] print:bg-slate-700" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

const defaultFilters = {
  order_number: "",
  product: "",
  customer: "",
  work_order: "",
  machine: "",
  department: "",
  shift: "",
  priority: "",
  status: "",
  date_from: "",
  date_to: "",
};

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val).slice(0, 10) : d.toLocaleDateString(undefined, { dateStyle: "short" });
}

export default function ProductionPlanning() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [startModal, setStartModal] = useState(null);
  const [startChecks, setStartChecks] = useState([]);
  const [startLoading, setStartLoading] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [completeSteps, setCompleteSteps] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // State to track which single order is being printed
  const [printDetailOrder, setPrintDetailOrder] = useState(null);

  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        getProductionOrders().catch(() => ({ data: [] })),
        getProductionPlanningSummary().catch(() => ({ data: null })),
      ]);
      const apiRows = oRes.data || [];
      setOrders(apiRows.map((row, i) => enrichApiOrder(row, i)));
      setApiSummary(sRes.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const date_from = searchParams.get("date_from") ?? "";
    const date_to = searchParams.get("date_to") ?? "";
    if (date_from || date_to) {
      setFilters({ ...defaultFilters, date_from, date_to });
      setShowAdvanced(true);
    }
  }, [searchParams]);

  // Clean up print state after printing dialog closes
  useEffect(() => {
    const handleAfterPrint = () => setPrintDetailOrder(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useManufacturingRefresh(load);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filters.order_number && !String(o.order_number).toLowerCase().includes(filters.order_number.toLowerCase())) return false;
      if (filters.product && !String(o.product_name || "").toLowerCase().includes(filters.product.toLowerCase())) return false;
      if (filters.customer && !String(o.customer_name || "").toLowerCase().includes(filters.customer.toLowerCase())) return false;
      if (filters.work_order && !String(o.work_order_number || "").toLowerCase().includes(filters.work_order.toLowerCase())) return false;
      if (filters.machine && !String(o.machine_name || "").toLowerCase().includes(filters.machine.toLowerCase())) return false;
      if (filters.department && o.department !== filters.department) return false;
      if (filters.shift && o.shift !== filters.shift) return false;
      if (filters.priority && o.priority !== filters.priority) return false;
      if (filters.status && o.status !== filters.status) return false;
      const startDate = o.start_date ? String(o.start_date).slice(0, 10) : "";
      if (filters.date_from && (!startDate || startDate < filters.date_from)) return false;
      if (filters.date_to && (!startDate || startDate > filters.date_to)) return false;
      return true;
    });
  }, [orders, filters]);

  const summary = useMemo(() => {
    if (apiSummary && !Object.values(filters).some(Boolean)) {
      return apiSummary;
    }
    return computePlanningSummary(filteredOrders);
  }, [apiSummary, filteredOrders, filters]);

  const showTodayStartOrders = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters({ ...defaultFilters, date_from: today, date_to: today });
    setSearchParams({ date_from: today, date_to: today });
    setShowAdvanced(true);
  };

  const openOrder = async (order) => {
    setSelected(order);
    setDetail(null);
    if (typeof order.id === "number") {
      try {
        const res = await getProductionOrderDetail(order.id);
        setDetail(enrichApiOrder(res.data));
      } catch {
        /* use list */
      }
    }
  };

  const handlePriorityChange = (orderId, newPriority) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, priority: newPriority } : o)));
    addToast(`Priority updated to ${newPriority}`);
    // Here you would typically also make an API call to save the change:
    // await updateProductionOrderPriority(orderId, newPriority);
  };

  const handleStartClick = async (order) => {
    if (typeof order.id === "number") {
      try {
        const res = await getProductionOrderStartChecks(order.id);
        setStartChecks(res.data || []);
        setStartModal(order);
        return;
      } catch {
        addToast("Could not load start checks", "error");
        return;
      }
    }
    setStartChecks([
      { check_type: "material", label: "Material Availability", ready: true, message: "All required materials available" },
      { check_type: "machine", label: "Machine Availability", ready: !!order.machine_name, message: order.machine_name ? "Machine ready" : "No machine assigned" },
      { check_type: "operator", label: "Operator Availability", ready: !!order.operator_name, message: order.operator_name ? "Operator assigned" : "No operator" },
    ]);
    setStartModal(order);
  };

  const confirmStart = async () => {
    const order = startModal;
    if (!order) return;
    setStartLoading(true);
    if (typeof order.id === "number") {
      try {
        const res = await startProductionOrder(order.id);
        if (res.data?.success) {
          addToast("Production started");
          load();
          setStartModal(null);
        } else {
          setStartChecks(res.data?.checks || []);
          addToast(res.data?.message || "Checks failed", "error");
        }
      } catch (err) {
        addToast(err.response?.data?.detail || "Start failed", "error");
      } finally {
        setStartLoading(false);
      }
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "in_progress" } : o)));
    addToast("Production started");
    setStartModal(null);
    setStartLoading(false);
  };

  const handlePause = async (order) => {
    if (typeof order.id === "number") {
      try {
        await pauseProductionOrder(order.id);
        addToast("Production paused");
        load();
      } catch {
        addToast("Pause failed", "error");
      }
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "planned" } : o)));
    addToast("Production paused");
  };

  const handleComplete = async (order) => {
    if (typeof order.id === "number") {
      try {
        const res = await completeProductionOrder(order.id);
        if (res.data?.success) {
          setCompleteSteps(res.data.steps || []);
          setCompleteModal(order);
          addToast(res.data.message || "Completed");
          load();
          setSelected(null);
        } else {
          addToast(res.data?.message || "Complete failed", "error");
        }
      } catch (err) {
        addToast(err.response?.data?.detail || "Complete failed", "error");
      }
      return;
    }
    setCompleteSteps([
      "Production finished — quality inspection initiated",
      "Quality inspection passed",
      "Inventory updated with finished goods",
      "Order marked completed",
    ]);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "completed", produced_quantity: o.planned_quantity, progress_pct: 100 } : o)));
    setCompleteModal(order);
    addToast("Order completed");
  };

  const handleImportFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
        if (lines.length <= 1) {
          addToast("Import failed: CSV file is empty or missing data rows", "error");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        const importedRows = lines.slice(1).map((line, idx) => {
          const values = line.split(",").map((v) => v.trim());
          const obj = {};
          headers.forEach((header, index) => {
            const key = header.toLowerCase().replace(/ /g, "_");
            obj[key] = values[index] || "";
          });

          return enrichApiOrder({
            id: `imported-${Date.now()}-${idx}`,
            order_number: obj.order_number || obj.po_number || `PO-IMP-${idx + 1}`,
            product_name: obj.product_name || obj.product || "Imported Product",
            customer_name: obj.customer_name || obj.customer || "N/A",
            planned_quantity: Number(obj.planned_quantity || obj.quantity || 0),
            priority: (obj.priority || "medium").toLowerCase(),
            department: obj.department || "Production",
            shift: obj.shift || "Shift A",
            start_date: obj.start_date || new Date().toISOString().slice(0, 10),
            due_date: obj.due_date || new Date().toISOString().slice(0, 10),
            status: obj.status || "planned",
            produced_quantity: Number(obj.produced_quantity || 0),
          });
        });

        setOrders((prev) => [...importedRows, ...prev]);
        addToast(`Successfully imported ${importedRows.length} production orders`);
      } catch (err) {
        addToast("Error parsing file. Please check CSV format.", "error");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const exportColumns = [
    { key: "order_number", label: "Order No" },
    { key: "product_name", label: "Product" },
    { key: "customer_name", label: "Customer" },
    { key: "planned_quantity", label: "Planned" },
    { key: "produced_quantity", label: "Produced" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
  ];

  const handleExportExcel = () => {
    exportToExcel(filteredOrders, exportColumns, "production-planning");
    addToast("Exported products to Excel");
  };

  const handleExportPdf = () => {
    exportToPdf(filteredOrders, exportColumns, "Production Planning", "production-planning");
    addToast("Exported products to PDF");
  };

  const handleGlobalPrint = () => {
    setPrintDetailOrder(null);
    setTimeout(() => window.print(), 100);
  };

  const handleIndividualPrint = (order) => {
    setPrintDetailOrder(order);
    setTimeout(() => window.print(), 100);
  };

  const columns = [
    { key: "order_number", label: "Order No" },
    { 
      key: "product_name", 
      label: "Product",
      render: (r) => (
        <span className="font-medium text-slate-900 print:text-black print:font-semibold">
          {r.product_name || "—"}
        </span>
      )
    },
    { key: "customer_name", label: "Customer" },
    { key: "bom_version", label: "BOM" },
    { key: "planned_quantity", label: "Planned Qty" },
    {
      key: "produced_quantity",
      label: "Produced",
      render: (r) => r.produced_quantity ?? 0,
    },
    {
      key: "balance_quantity",
      label: "Balance",
      render: (r) => r.balance_quantity ?? Math.max((r.planned_quantity || 0) - (r.produced_quantity || 0), 0),
    },
    {
      key: "priority",
      label: "Priority",
      render: (r) => {
        const p = priorityBadge(r.priority || "medium");
        return (
          <>
            <div className="print:hidden">
              <select
                value={r.priority || "medium"}
                onChange={(e) => handlePriorityChange(r.id, e.target.value)}
                className={`inline-flex h-6 items-center rounded-full border-none pl-2 pr-6 text-xs font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer ${p.bg} ${p.text}`}
              >
                {PRIORITIES.map((priorityStr) => (
                  <option key={priorityStr} value={priorityStr} className="bg-white text-slate-900 capitalize">
                    {priorityStr}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden print:block">
              <PriorityPill priority={r.priority} />
            </div>
          </>
        );
      },
    },
    { key: "machine_name", label: "Machine" },
    { key: "shift", label: "Shift" },
    {
      key: "start_date",
      label: "Start",
      render: (r) => formatDate(r.start_date),
    },
    {
      key: "due_date",
      label: "Due",
      render: (r) => formatDate(r.due_date),
    },
    {
      key: "progress",
      label: "Progress",
      sortable: false,
      render: (r) => <ProgressCell row={r} />,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize print:border print:border-slate-300 ${
          r.is_delayed ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
        }`}>
          {r.is_delayed ? "delayed" : statusLabel(r.status)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-xs print:hidden">
          <button type="button" title="View" onClick={() => openOrder(r)} className="font-semibold text-[#2563EB] hover:underline">👁 View</button>
          <Link to="/production/create" className="font-semibold text-slate-600 hover:underline">✏ Edit</Link>
          {canStart(r.status) && (
            <button type="button" onClick={() => handleStartClick(r)} className="font-semibold text-green-700 hover:underline">▶ Start</button>
          )}
          {canPause(r.status) && (
            <button type="button" onClick={() => handlePause(r)} className="font-semibold text-amber-700 hover:underline">⏸ Pause</button>
          )}
          {canComplete(r.status) && (
            <button type="button" onClick={() => handleComplete(r)} className="font-semibold text-teal-700 hover:underline">✅ Complete</button>
          )}
          <button type="button" onClick={() => handleIndividualPrint(r)} className="font-semibold text-slate-500 hover:underline">🖨 Print</button>
          <Link to="/production/work-orders" className="font-semibold text-slate-500 hover:underline">📄 WO</Link>
        </div>
      ),
    },
  ];

  if (loading) return <Loader label="Loading production planning..." />;

  return (
    <>
      <div className={`space-y-6 pb-8 ${printDetailOrder ? "hidden print:hidden" : "print:p-0 print:space-y-4 print:block"}`}>
        {/* Global Print-only Header */}
        <div className="hidden print:block mb-4 border-b pb-4">
          <h1 className="text-xl font-bold text-black">Production Planning Report</h1>
          <p className="text-xs text-slate-600">
            Generated on: {new Date().toLocaleDateString()} | Total Orders: {filteredOrders.length}
          </p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv, .txt"
          className="hidden"
        />

        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Production Planning</h1>
            <p className="mt-1 text-sm text-slate-500">
              Plan, schedule, and monitor production orders across machines, materials, and operators.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/production/create" className="ui-btn-primary">
              <Plus className="h-4 w-4" /> New Production Order
            </Link>
            <button type="button" onClick={handleImportFileClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" /> Import
            </button>
            <button type="button" onClick={handleExportExcel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-4 w-4" /> Export Excel
            </button>
            <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileText className="h-4 w-4" /> Export PDF
            </button>
            <button type="button" onClick={handleGlobalPrint} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </header>

        <div className="print:hidden">
          <ManufacturingWorkflowBar currentStepId="production_planning" />
        </div>

        <div className="mb-0 flex flex-wrap gap-2 print:hidden">
          <Link to="/production/mrp" className="ui-btn-secondary text-sm">Run MRP</Link>
          <Link to="/production/work-orders" className="ui-btn-secondary text-sm">Work Orders</Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8 print:hidden">
          <SummaryCard label="Total Orders" value={summary.total_orders} icon={ClipboardList} color="bg-[#2563EB]" />
          <SummaryCard label="Planned" value={summary.planned_orders} icon={FileText} color="bg-blue-500" />
          <SummaryCard label="In Progress" value={summary.in_progress_orders} icon={Play} color="bg-amber-500" />
          <SummaryCard label="Completed" value={summary.completed_orders} icon={CheckCircle2} color="bg-green-500" />
          <SummaryCard label="Delayed" value={summary.delayed_orders} icon={AlertTriangle} color="bg-red-500" />
          <SummaryCard label="Cancelled" value={summary.cancelled_orders} icon={Pause} color="bg-slate-500" />
          <SummaryCard label="Today's Target" value={summary.todays_target?.toLocaleString?.() ?? summary.todays_target} icon={ClipboardList} color="bg-indigo-500" />
          <SummaryCard
            label="Today's Production"
            value={summary.todays_production?.toLocaleString?.() ?? summary.todays_production}
            icon={CheckCircle2}
            color="bg-teal-500"
            onClick={showTodayStartOrders}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:p-0 print:border-none print:shadow-none">
          <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
            <input
              type="search"
              placeholder="Search production orders..."
              value={filters.order_number || filters.product}
              onChange={(e) => setFilters((f) => ({ ...f, order_number: e.target.value, product: e.target.value }))}
              className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              {showAdvanced ? "Hide Filters" : "Advanced Filters"}
            </button>
          </div>

          {showAdvanced && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 print:hidden">
              <input placeholder="Order No." value={filters.order_number} onChange={(e) => setFilters((f) => ({ ...f, order_number: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Product" value={filters.product} onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Customer" value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Work Order" value={filters.work_order} onChange={(e) => setFilters((f) => ({ ...f, work_order: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input placeholder="Machine" value={filters.machine} onChange={(e) => setFilters((f) => ({ ...f, machine: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filters.shift} onChange={(e) => setFilters((f) => ({ ...f, shift: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Shift</option>
                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm">
                <option value="">Status</option>
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <input type="date" value={filters.date_from} onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <input type="date" value={filters.date_to} onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))} className="rounded-lg border px-3 py-2 text-sm" />
              <button type="button" onClick={() => setFilters(defaultFilters)} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
            </div>
          )}

          <div className="print:w-full print:text-xs">
            <DataTable
              columns={columns}
              data={filteredOrders}
              showSearch={false}
              emptyState={
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-sm font-medium text-slate-600">No production orders found.</p>
                  <Link to="/production/create" className="ui-btn-primary mt-4 inline-flex print:hidden">Create Production Order</Link>
                </div>
              }
            />
          </div>
        </div>

        <div className="print:hidden">
          <ManufacturingWorkflowBar currentStepId="production_planning" compact />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 print:hidden">
          <p className="mb-2 text-xs font-semibold text-slate-500">Status Flow</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FLOW.map((s, i) => (
              <span key={s} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{s}</span>
                {i < STATUS_FLOW.length - 1 && <span className="text-slate-300">↓</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Single Item Print View */}
      {printDetailOrder && (
        <div className="hidden print:block p-8 bg-white text-black h-screen">
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-3xl font-bold uppercase tracking-wide">Production Order Details</h1>
            <p className="text-sm text-slate-500 mt-1">Order # {printDetailOrder.order_number} | Printed on {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-8">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Product Information</p>
              <p className="text-xl font-bold text-slate-900">{printDetailOrder.product_name || "—"}</p>
              <p className="text-sm text-slate-700 mt-1">BOM Version: {printDetailOrder.bom_version || "Default"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Customer</p>
              <p className="text-lg font-medium text-slate-800">{printDetailOrder.customer_name || "Internal"}</p>
            </div>
            
            <div className="col-span-2 border-t border-slate-200 pt-6"></div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Priority & Status</p>
              <div className="flex items-center gap-4 mt-1">
                <PriorityPill priority={printDetailOrder.priority} />
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize border border-slate-300`}>
                  {printDetailOrder.is_delayed ? "delayed" : statusLabel(printDetailOrder.status)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Production Quantities</p>
              <div className="grid grid-cols-3 gap-4 mt-1">
                <div>
                  <span className="block text-xl font-bold">{printDetailOrder.planned_quantity}</span>
                  <span className="text-xs text-slate-500">Planned</span>
                </div>
                <div>
                  <span className="block text-xl font-bold">{printDetailOrder.produced_quantity || 0}</span>
                  <span className="text-xs text-slate-500">Produced</span>
                </div>
                <div>
                  <span className="block text-xl font-bold">{Math.max((printDetailOrder.planned_quantity || 0) - (printDetailOrder.produced_quantity || 0), 0)}</span>
                  <span className="text-xs text-slate-500">Balance</span>
                </div>
              </div>
            </div>

            <div className="col-span-2 border-t border-slate-200 pt-6"></div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Schedule</p>
              <p className="text-sm"><span className="font-medium">Start:</span> {formatDate(printDetailOrder.start_date)}</p>
              <p className="text-sm mt-1"><span className="font-medium">Due:</span> {formatDate(printDetailOrder.due_date)}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assignment</p>
              <p className="text-sm"><span className="font-medium">Machine:</span> {printDetailOrder.machine_name || "Unassigned"}</p>
              <p className="text-sm mt-1"><span className="font-medium">Shift:</span> {printDetailOrder.shift || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <ProductionOrderDetailModal
          order={selected}
          detail={detail}
          onClose={() => { setSelected(null); setDetail(null); }}
          onStart={handleStartClick}
          onPause={handlePause}
          onComplete={handleComplete}
        />
      )}

      {startModal && (
        <StartCheckModal
          order={startModal}
          checks={startChecks}
          onClose={() => setStartModal(null)}
          onConfirm={confirmStart}
          loading={startLoading}
        />
      )}

      {completeModal && (
        <CompleteWorkflowModal
          order={completeModal}
          steps={completeSteps}
          onClose={() => setCompleteModal(null)}
        />
      )}

      {/* Global CSS for Print Optimization */}
      <style>{`
        @media print {
          body {
            background-color: #fff !important;
            color: #000 !important;
            font-size: 11px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 8px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}