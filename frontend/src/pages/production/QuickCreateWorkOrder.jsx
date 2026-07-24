import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

import { useToast } from "../../context/ToastContext";
import {
  getProducts,
  getMachines,
  quickCreateWorkOrder,
} from "../../api/productionApi";
import useTenantId from "../../hooks/useTenantId";



/** 3-step flow: Product → Quantity → Machine → Save → Done */
export default function QuickCreateWorkOrder() {
  const tenantId = useTenantId();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [products, setProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    product_id: "",
    planned_quantity: "",
    machine_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const pRes = await getProducts(tenantId);
        const prodList = pRes?.data || [];
        const mRes = await getMachines(tenantId);
        setProducts(prodList);
        setMachines(mRes?.data || []);
      } catch (e) {
        console.error(e);
        setProducts([]);
        setMachines([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(form.planned_quantity);
    if (!form.product_id || !form.planned_quantity || isNaN(qty) || qty <= 0) {
      setError("Product and quantity are required. Quantity must be greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await quickCreateWorkOrder({
        tenant_id: tenantId,
        product_id: Number(form.product_id),
        planned_quantity: qty,
        machine_id: form.machine_id ? Number(form.machine_id) : null,
      });
      addToast("Work order created successfully", "success");
      navigate("/production/work-orders");
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => d.msg || d.message).join(", ")
        : typeof detail === "string"
          ? detail
          : err.response?.data?.message || "Unable to create work order.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="mt-6 space-y-4">
          <div className="h-10 rounded bg-slate-100" />
          <div className="h-10 rounded bg-slate-100" />
          <div className="h-10 rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
          {t("quickCreateWorkOrder.title", { defaultValue: "Create Work Order" })}
        </h2>
        <Link
          to="/"
          className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
        >
          ← Dashboard
        </Link>
      </div>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        {t("quickCreateWorkOrder.subtitle", {
          defaultValue: "3 steps: Select product, enter quantity, assign machine. Done.",
        })}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="product_id"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            1. {t("quickCreateWorkOrder.product", { defaultValue: "Product" })}
          </label>
          <select
            id="product_id"
            name="product_id"
            value={form.product_id}
            onChange={handleChange}
            required
            disabled={products.length === 0}
            className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
          >
            <option value="">
              {products.length === 0
                ? "No products available – please add products first"
                : t("quickCreateWorkOrder.selectProduct", { defaultValue: "Select product" })}
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="planned_quantity"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            2. {t("quickCreateWorkOrder.quantity", { defaultValue: "Quantity" })}
          </label>
          <input
            id="planned_quantity"
            type="number"
            name="planned_quantity"
            value={form.planned_quantity}
            onChange={handleChange}
            required
            min="1"
            step="1"
            placeholder="e.g. 100"
            className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label
            htmlFor="machine_id"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            3. {t("quickCreateWorkOrder.machine", { defaultValue: "Machine" })} (optional)
          </label>
          <select
            id="machine_id"
            name="machine_id"
            value={form.machine_id}
            onChange={handleChange}
            className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">{t("quickCreateWorkOrder.selectMachine", { defaultValue: "None" })}</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || products.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving
              ? t("quickCreateWorkOrder.creating", { defaultValue: "Creating..." })
              : t("quickCreateWorkOrder.save", { defaultValue: "Save & Done" })}
          </button>
          <Link
            to="/production"
            className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
          >
            {t("common.cancel", { defaultValue: "Cancel" })}
          </Link>
        </div>
      </form>
    </div>
  );
}