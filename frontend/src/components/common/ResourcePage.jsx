import { useCallback, useEffect, useMemo, useState } from "react";

import AdminModal from "../admin/AdminModal";
import DataTable from "./DataTable";
import EmptyState from "./EmptyState";
import Loader from "./Loader";
import PageHeader from "./PageHeader";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";

/**
 * Generic list + create page for simple CRUD-style modules.
 *
 * Props:
 *  - title, subtitle
 *  - columns: DataTable columns
 *  - fetcher: () => Promise<axiosResponse(list)>
 *  - createFn: (payload) => Promise<axiosResponse> (optional; omit to hide create)
 *  - fields: [{ name, label, type, required, options, default, placeholder, step }]
 *  - searchKeys, filters: DataTable props
 *  - createLabel: button label
 *  - emptyTitle, emptyDescription
 *  - rowActions: (row, reload) => ReactNode (optional)
 *  - transformPayload: (values) => payload (optional)
 */
export default function ResourcePage({
  title,
  subtitle,
  columns,
  fetcher,
  createFn,
  fields: fieldsProp,
  formFields,
  searchKeys = [],
  filters = [],
  createLabel = "+ New",
  emptyTitle = "Nothing here yet",
  emptyDescription = "Records will appear here once created.",
  rowActions,
  transformPayload,
}) {
  const fields = fieldsProp || formFields || [];
  const { user } = useAuth();
  const { addToast } = useToast();
  const tenantId = user?.tenant_id ?? 1;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const initialForm = useMemo(() => {
    const f = {};
    fields.forEach((field) => {
      f[field.name] = field.default ?? field.defaultValue ?? "";
    });
    return f;
  }, [fields]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher();
      setRows(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [fetcher, addToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openModal = () => {
    setForm(initialForm);
    setOpen(true);
  };

  const setField = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const buildPayload = () => {
    const values = { ...form };
    fields.forEach((field) => {
      const v = values[field.name];
      if (field.type === "number") {
        values[field.name] = v === "" || v == null ? null : Number(v);
      } else if (field.type === "datetime") {
        values[field.name] = v ? new Date(v).toISOString() : new Date().toISOString();
      } else if (v === "") {
        values[field.name] = field.required ? v : null;
      }
    });
    const base = { tenant_id: tenantId, ...values };
    return transformPayload ? transformPayload(base) : base;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !form[f.name] && form[f.name] !== 0);
    if (missing) {
      addToast(`${missing.label} is required`, "error");
      return;
    }
    setSaving(true);
    try {
      await createFn(buildPayload());
      addToast("Created successfully");
      setOpen(false);
      await reload();
    } catch (err) {
      addToast(err.response?.data?.detail || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const tableColumns = rowActions
    ? [
        ...columns,
        {
          key: "__actions",
          label: "Actions",
          render: (row) => rowActions(row, reload),
        },
      ]
    : columns;

  if (loading) return <Loader label={`Loading ${title.toLowerCase()}...`} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          createFn ? (
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {createLabel}
            </button>
          ) : null
        }
      />

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <DataTable
          columns={tableColumns}
          data={rows}
          searchPlaceholder="Search..."
          searchKeys={searchKeys}
          filters={filters}
          emptyState={
            <EmptyState
              icon="clipboard"
              title={emptyTitle}
              description={emptyDescription}
            />
          }
        />
      </div>

      {createFn && (
        <AdminModal title={title} subtitle="Create a new record" open={open} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={field.full ? "sm:col-span-2" : ""}
                >
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </label>
                  {field.type === "select" ? (
                    <select
                      value={form[field.name] ?? ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={form[field.name] ?? ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                      rows={3}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                  ) : (
                    <input
                      type={
                        field.type === "datetime"
                          ? "datetime-local"
                          : field.type || "text"
                      }
                      step={field.step}
                      value={form[field.name] ?? ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}
