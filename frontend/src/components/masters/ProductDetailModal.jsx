import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Barcode,
  Copy,
  History,
  QrCode,
  Trash2,
  X,
} from "lucide-react";

const TABS = [
  { id: "general", label: "General" },
  { id: "inventory", label: "Inventory" },
  { id: "pricing", label: "Pricing" },
  { id: "bom", label: "BOM" },
  { id: "suppliers", label: "Suppliers" },
  { id: "purchase", label: "Purchase History" },
  { id: "sales", label: "Sales History" },
  { id: "production", label: "Production History" },
  { id: "documents", label: "Documents" },
  { id: "audit", label: "Audit Logs" },
];

function Field({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value ?? "—"}</p>
    </div>
  );
}

function TabPlaceholder({ title }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {title} — connect to backend module when available.
    </div>
  );
}

export default function ProductDetailModal({
  product,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) {
  const [tab, setTab] = useState("general");
  if (!product) return null;

  const formatPrice = (n) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-[#2563EB]">{product.product_code}</p>
            <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-sm text-slate-500">{product.category} · {product.sku}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id
                  ? "bg-[#2563EB] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Product Code" value={product.product_code} />
                <Field label="Product Name" value={product.name} />
                <Field label="Category" value={product.category} />
                <Field label="Product Type" value={product.product_type} />
                <Field label="SKU" value={product.sku} />
                <Field label="Barcode" value={product.barcode} />
                <Field label="Brand" value={product.brand} />
                <Field label="Unit" value={product.unit} />
                <Field label="HSN Code" value={product.hsn_code} />
                <Field label="GST %" value={product.gst_percent != null ? `${product.gst_percent}%` : "—"} />
                <Field label="Warehouse" value={product.warehouse} />
                <Field label="Status" value={product.status} />
              </div>
              <Field label="Description" value={product.description} />
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Manufacturing</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Bill of Materials" value={product.bom} />
                  <Field label="Production Time" value={product.production_time} />
                  <Field label="Machine Required" value={product.machine_required} />
                  <Field label="Quality Standard" value={product.quality_standard} />
                  <Field label="Batch Tracking" value={product.batch_tracking ? "Yes" : "No"} />
                  <Field label="Serial Number" value={product.serial_number ? "Yes" : "No"} />
                  <Field label="Expiry Date" value={product.expiry_date || "N/A"} />
                </div>
              </div>
            </div>
          )}

          {tab === "inventory" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Current Stock" value={product.current_stock} />
              <Field label="Minimum Stock" value={product.min_stock} />
              <Field label="Maximum Stock" value={product.max_stock} />
              <Field label="Warehouse" value={product.warehouse} />
              <Field label="Unit" value={product.unit} />
              <Field label="Stock Value" value={formatPrice(product.stock_value)} />
            </div>
          )}

          {tab === "pricing" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Purchase Price" value={formatPrice(product.purchase_price)} />
              <Field label="Selling Price" value={formatPrice(product.selling_price)} />
              <Field label="GST %" value={product.gst_percent != null ? `${product.gst_percent}%` : "—"} />
              <Field label="HSN Code" value={product.hsn_code} />
              <Field label="Margin" value={
                product.selling_price && product.purchase_price
                  ? formatPrice(product.selling_price - product.purchase_price)
                  : "—"
              } />
            </div>
          )}

          {tab === "bom" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">BOM reference: <strong>{product.bom}</strong></p>
              <Link to="/masters/bom" className="text-sm font-semibold text-[#2563EB] hover:underline">
                Open BOM Master →
              </Link>
            </div>
          )}

          {tab === "suppliers" && <TabPlaceholder title="Suppliers" />}
          {tab === "purchase" && (
            <div className="space-y-2">
              <TabPlaceholder title="Purchase History" />
              <Link to="/procurement/purchase-orders" className="text-sm font-semibold text-[#2563EB] hover:underline">
                View Purchase Orders →
              </Link>
            </div>
          )}
          {tab === "sales" && (
            <div className="space-y-2">
              <TabPlaceholder title="Sales History" />
              <Link to="/sales/orders" className="text-sm font-semibold text-[#2563EB] hover:underline">
                View Sales Orders →
              </Link>
            </div>
          )}
          {tab === "production" && (
            <div className="space-y-2">
              <TabPlaceholder title="Production History" />
              <Link to="/production/work-orders" className="text-sm font-semibold text-[#2563EB] hover:underline">
                View Work Orders →
              </Link>
            </div>
          )}
          {tab === "documents" && <TabPlaceholder title="Documents" />}
          {tab === "audit" && <TabPlaceholder title="Audit Logs" />}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button type="button" onClick={() => onEdit(product)} className="ui-btn-primary text-xs">
            Edit
          </button>
          <button type="button" onClick={() => onDuplicate(product)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <Barcode className="h-3.5 w-3.5" /> Print Barcode
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <QrCode className="h-3.5 w-3.5" /> Print QR
          </button>
          <Link to="/inventory/stock-ledger" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-underline">
            <History className="h-3.5 w-3.5" /> Stock Ledger
          </Link>
          <button type="button" onClick={() => onDelete(product)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductFormModal({ product, onClose, onSave }) {
  const isEdit = Boolean(product?.id && !String(product.id).startsWith("demo-") && !String(product.id).startsWith("new-"));
  const [form, setForm] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    category: product?.category || "Finished Goods",
    product_type: product?.product_type || "Finished Goods",
    unit: product?.unit || "Nos",
    brand: product?.brand || "",
    warehouse: product?.warehouse || "Main Store",
    purchase_price: product?.purchase_price ?? "",
    selling_price: product?.selling_price ?? "",
    min_stock: product?.min_stock ?? 1,
    max_stock: product?.max_stock ?? 100,
    current_stock: product?.current_stock ?? 1,
    description: product?.description || "",
    status: product?.status || "active",
  });

  const normalizePositiveInt = (value) => {
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return "";
    const parsed = parseInt(cleaned, 10);
    return parsed > 0 ? parsed : "";
  };

  const isPositiveInt = (value) => /^[1-9][0-9]*$/.test(String(value));

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      !isPositiveInt(form.purchase_price) ||
      !isPositiveInt(form.selling_price) ||
      !isPositiveInt(form.min_stock) ||
      !isPositiveInt(form.current_stock)
    ) {
      window.alert("Please enter positive whole numbers from 1 for Purchase Price, Selling Price, Min Stock, and Current Stock.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{isEdit ? "Edit Product" : "Add Product"}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold text-slate-500">Product Name *</span>
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">SKU *</span>
            <input required value={form.sku} onChange={(e) => set("sku", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Category</span>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {["Raw Material", "WIP", "Finished Goods", "Consumables", "Spare Parts"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Unit</span>
            <input value={form.unit} onChange={(e) => set("unit", e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Purchase Price (₹)</span>
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              value={form.purchase_price}
              onChange={(e) => set("purchase_price", normalizePositiveInt(e.target.value))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                e.preventDefault();
                set("purchase_price", normalizePositiveInt(pasted));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Selling Price (₹)</span>
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              value={form.selling_price}
              onChange={(e) => set("selling_price", normalizePositiveInt(e.target.value))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                e.preventDefault();
                set("selling_price", normalizePositiveInt(pasted));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Min Stock</span>
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              value={form.min_stock}
              onChange={(e) => set("min_stock", normalizePositiveInt(e.target.value))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                e.preventDefault();
                set("min_stock", normalizePositiveInt(pasted));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-slate-500">Current Stock</span>
            <input
              required
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              value={form.current_stock}
              onChange={(e) => set("current_stock", normalizePositiveInt(e.target.value))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
                e.preventDefault();
                set("current_stock", normalizePositiveInt(pasted));
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold text-slate-500">Description</span>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="submit" className="ui-btn-primary">{isEdit ? "Save Changes" : "Add Product"}</button>
        </div>
      </form>
    </div>
  );
}
