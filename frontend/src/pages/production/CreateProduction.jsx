import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import ManufacturingWorkflowBar from "../../components/manufacturing/ManufacturingWorkflowBar";
import { createProductionOrder, getProducts } from "../../api/productionApi";
import useTenantId from "../../hooks/useTenantId";

export default function CreateProduction() {
  const tenantId = useTenantId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const salesOrderId = searchParams.get("sales_order_id");
  const salesOrderNumber = searchParams.get("sales_order_number") || "";
  const prefilledProductId = searchParams.get("product_id") || "";
  const prefilledQty = searchParams.get("quantity") || "";

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [form, setForm] = useState({
    tenant_id: tenantId,
    product_id: prefilledProductId,
    order_number: salesOrderNumber ? `PO-${salesOrderNumber}` : "",
    planned_quantity: prefilledQty,
    start_date: "",
    due_date: "",
    status: "planned",
    sales_order_id: salesOrderId ? Number(salesOrderId) : null,
    sales_order_number: salesOrderNumber || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const loadProducts = () => {
    setLoadingProducts(true);
    getProducts(tenantId)
      .then((r) => setProducts(r?.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: null }));
    setError("");
  };

  const validate = () => {
    const errs = {};
    const qty = Number(form.planned_quantity);
    if (form.planned_quantity === "" || isNaN(qty)) {
      errs.planned_quantity = "Planned quantity is required";
    } else if (qty <= 0) {
      errs.planned_quantity = "Planned quantity must be greater than 0";
    }
    if (form.start_date && form.due_date) {
      if (new Date(form.due_date) < new Date(form.start_date)) {
        errs.due_date = "Due date must be on or after start date";
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      await createProductionOrder({
        ...form,
        product_id: Number(form.product_id),
        planned_quantity: Number(form.planned_quantity),
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        sales_order_id: form.sales_order_id || null,
        sales_order_number: form.sales_order_number || null,
      });
      navigate(
        salesOrderId
          ? `/sales/orders/${salesOrderId}`
          : "/production/planning"
      );
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || d.message).join(", ")
        : typeof detail === "string"
          ? detail
          : "Unable to create production order.";
      if (msg.toLowerCase().includes("already exists")) {
        setFieldErrors((prev) => ({ ...prev, order_number: msg }));
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">{t("createProduction.title")}</h2>
        <Link
          to={salesOrderId ? `/sales/orders/${salesOrderId}` : "/production/planning"}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>

      <div className="mb-4">
        <ManufacturingWorkflowBar currentStepId="production_planning" compact />
      </div>

      {salesOrderNumber && (
        <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          Linked sales order: <strong>{salesOrderNumber}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label htmlFor="product_id" className="block text-sm font-medium text-slate-700">
            {t("createProduction.product")}
          </label>
          <select
            id="product_id"
            name="product_id"
            value={form.product_id}
            onChange={handleChange}
            required
            disabled={loadingProducts}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">{loadingProducts ? t("createProduction.loading") : t("createProduction.selectProduct")}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
          {products.length === 0 && !loadingProducts && (
            <div className="mt-2">
              <p className="text-xs text-amber-600">No products found. Please add products first via Masters → Products.</p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="order_number" className="block text-sm font-medium text-slate-700">
            Order Number
          </label>
          <input
            id="order_number"
            type="text"
            name="order_number"
            value={form.order_number}
            onChange={handleChange}
            required
            placeholder="e.g. PO-2024-001"
            className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              fieldErrors.order_number
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {fieldErrors.order_number && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.order_number}</p>
          )}
        </div>

        <div>
          <label htmlFor="planned_quantity" className="block text-sm font-medium text-slate-700">
            {t("createProduction.plannedQuantity")}
          </label>
          <input
            id="planned_quantity"
            type="number"
            name="planned_quantity"
            value={form.planned_quantity}
            onChange={handleChange}
            required
            min="0.01"
            step="0.01"
            placeholder="e.g. 100"
            className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
              fieldErrors.planned_quantity
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            }`}
          />
          {fieldErrors.planned_quantity && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.planned_quantity}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-slate-700">
              Start Date
            </label>
            <input
              id="start_date"
              type="datetime-local"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-slate-700">
              {t("createProduction.dueDate")}
            </label>
            <input
              id="due_date"
              type="datetime-local"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
              className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                fieldErrors.due_date
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            {fieldErrors.due_date && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.due_date}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || loadingProducts}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-400"
          >
            {saving ? t("createProduction.creating") : t("createProduction.createOrder")}
          </button>
          <Link
            to="/production/planning"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {t("createProduction.cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}