import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  HardDrive,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import Loader from "../../components/common/Loader";
import { useToast } from "../../context/ToastContext";
import useAuth from "../../hooks/useAuth";
import {
  createDocument,
  deleteDocument,
  getDocuments,
  updateDocument,
} from "../../api/documentsApi";
import { isAdmin } from "../../config/permissions";
import {
  DOC_TYPES,
  getAllowedDocTypes,
  canWriteDocuments,
  fileTypeCategory,
  FILE_TYPE_LABELS,
  formatFileSize,
  formatDocDate,
  computeDocumentSummary,
  fileExtension,
} from "../../utils/documentUtils";

const PAGE_SIZE = 10;
const SUPPORTED = ["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "zip"];

const FILE_ICONS = {
  pdf: FileText,
  image: FileImage,
  excel: FileSpreadsheet,
  word: FileText,
  ppt: FileText,
  zip: FileArchive,
  other: File,
};

const DEPARTMENT_BY_TYPE = {
  purchase: "Store / Inventory",
  production: "Production",
  quality: "Quality",
  report: "Finance",
  hr: "HR",
  general: "General",
};

function KpiCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
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

function FileTypeIcon({ name }) {
  const cat = fileTypeCategory(name);
  const Icon = FILE_ICONS[cat] || File;
  const colors = {
    pdf: "text-red-600",
    image: "text-violet-600",
    excel: "text-emerald-600",
    word: "text-blue-600",
    ppt: "text-orange-600",
    zip: "text-amber-600",
    other: "text-slate-500",
  };
  return <Icon className={`h-5 w-5 ${colors[cat]}`} title={FILE_TYPE_LABELS[cat]} />;
}

function emptyForm(docType = "general") {
  return {
    title: "",
    doc_type: docType,
    file_name: "",
    file_path: "",
    description: "",
    uploaded_by: "",
    reference_type: "",
  };
}

export default function DocumentsDashboard({ initialDocType = null, title, subtitle }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const allowedTypes = useMemo(() => getAllowedDocTypes(user), [user]);
  const canWrite = canWriteDocuments(user);
  const admin = isAdmin(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialDocType || "");
  const [department, setDepartment] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [fileType, setFileType] = useState("");
  const [status, setStatus] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm(initialDocType || "general"));
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocuments(initialDocType || null);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const scoped = data.filter((d) => {
        if (!allowedTypes.length) return false;
        if (admin) return true;
        return allowedTypes.includes(d.doc_type);
      });
      setRows(scoped);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Failed to load documents");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [initialDocType, allowedTypes, admin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (initialDocType) setCategory(initialDocType);
  }, [initialDocType]);

  const enriched = useMemo(
    () =>
      rows.map((d) => ({
        ...d,
        category: DOC_TYPES.find((t) => t.value === d.doc_type)?.label || d.doc_type,
        department: DEPARTMENT_BY_TYPE[d.doc_type] || d.reference_type || "—",
        version: d.version || "1.0",
        file_size_label: formatFileSize(d.file_size),
        created_label: formatDocDate(d.created_at),
        status: d.status || (d.file_path ? "Available" : "Draft"),
        file_cat: fileTypeCategory(d.file_name || d.title),
      })),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((d) => {
      if (category && d.doc_type !== category) return false;
      if (department && d.department !== department) return false;
      if (uploadedBy && !String(d.uploaded_by || "").toLowerCase().includes(uploadedBy.toLowerCase())) {
        return false;
      }
      if (fileType && d.file_cat !== fileType) return false;
      if (status && String(d.status).toLowerCase() !== status.toLowerCase()) return false;
      if (dateFrom) {
        const t = new Date(d.created_at).getTime();
        if (Number.isFinite(t) && t < new Date(dateFrom).getTime()) return false;
      }
      if (!q) return true;
      return [d.title, d.file_name, d.description, d.uploaded_by, d.doc_type, d.category]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [enriched, search, category, department, uploadedBy, fileType, status, dateFrom]);

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

  const summary = useMemo(() => computeDocumentSummary(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, category, department, uploadedBy, fileType, status, dateFrom]);

  const openCreate = () => {
    setForm(emptyForm(initialDocType || allowedTypes[0] || "general"));
    setModal("create");
  };

  const openEdit = (doc) => {
    setForm({
      title: doc.title || "",
      doc_type: doc.doc_type || "general",
      file_name: doc.file_name || "",
      file_path: doc.file_path || "",
      description: doc.description || "",
      uploaded_by: doc.uploaded_by || "",
      reference_type: doc.reference_type || "",
    });
    setModal({ type: "edit", id: doc.id });
  };

  const validateFileName = (name) => {
    if (!name) return true;
    const ext = fileExtension(name);
    return !ext || SUPPORTED.includes(ext);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!allowedTypes.includes(form.doc_type) && !admin) {
      addToast("You do not have permission for this document category", "error");
      return;
    }
    if (!validateFileName(form.file_name)) {
      addToast(`Supported files: ${SUPPORTED.join(", ").toUpperCase()}`, "error");
      return;
    }
    try {
      const payload = {
        ...form,
        tenant_id: user?.tenant_id ?? 1,
        uploaded_by: form.uploaded_by || user?.full_name || user?.email || "User",
      };
      if (modal === "create") {
        await createDocument(payload);
        addToast("Document uploaded");
      } else {
        await updateDocument(modal.id, payload);
        addToast("Document updated");
      }
      setModal(null);
      await load();
    } catch (err) {
      addToast(err.response?.data?.detail || "Save failed", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    setBusyId(id);
    try {
      await deleteDocument(id);
      addToast("Document deleted");
      await load();
    } catch (err) {
      addToast(err.response?.data?.detail || "Delete failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = (doc) => {
    if (!doc.file_path) {
      addToast("No file path available for download", "error");
      return;
    }
    window.open(doc.file_path, "_blank", "noopener,noreferrer");
  };

  const handlePreview = (doc) => {
    if (!doc.file_path) {
      addToast("No file available to preview", "error");
      return;
    }
    setPreview(doc);
  };

  const deptOptions = [...new Set(Object.values(DEPARTMENT_BY_TYPE))];

  if (loading) return <Loader label="Loading documents..." />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title || "Documents"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {subtitle ||
              "Central document management for purchase, production, quality, finance, and HR files."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Supported: PDF, DOCX, XLSX, PPTX, PNG, JPG, ZIP
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" /> Upload Document
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total Documents" value={summary.total} icon={FolderOpen} color="bg-blue-600" />
        <KpiCard label="PDF Files" value={summary.pdf} icon={FileText} color="bg-red-500" />
        <KpiCard label="Images" value={summary.image} icon={FileImage} color="bg-violet-500" />
        <KpiCard label="Excel Files" value={summary.excel} icon={FileSpreadsheet} color="bg-emerald-600" />
        <KpiCard label="Word Files" value={summary.word} icon={FileText} color="bg-sky-600" />
        <KpiCard label="Recent Uploads" value={summary.recent} icon={Plus} color="bg-amber-500" />
        <KpiCard
          label="Storage Used"
          value={formatFileSize(summary.storageBytes) === "—" ? "—" : formatFileSize(summary.storageBytes)}
          icon={HardDrive}
          color="bg-slate-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
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
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!!initialDocType}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">All categories</option>
              {DOC_TYPES.filter((t) => admin || allowedTypes.includes(t.value)).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All departments</option>
              {deptOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <input
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              placeholder="Uploaded by"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All file types</option>
              {Object.entries(FILE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="Available">Available</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  ["title", "Document Name"],
                  ["category", "Category"],
                  ["department", "Department"],
                  ["uploaded_by", "Uploaded By"],
                  ["version", "Version"],
                  ["file_size", "File Size"],
                  ["created_at", "Created Date"],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    className="cursor-pointer whitespace-nowrap px-3 py-3 font-semibold hover:text-slate-800"
                    onClick={() => {
                      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortKey(key);
                        setSortDir("asc");
                      }
                    }}
                  >
                    {label}
                    {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </th>
                ))}
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    No documents found.
                  </td>
                </tr>
              ) : (
                pageRows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon name={doc.file_name || doc.title} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{doc.title}</p>
                          <p className="truncate text-xs text-slate-400">{doc.file_name || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">{doc.category}</td>
                    <td className="whitespace-nowrap px-3 py-3">{doc.department}</td>
                    <td className="px-3 py-3">{doc.uploaded_by || "—"}</td>
                    <td className="px-3 py-3">{doc.version}</td>
                    <td className="px-3 py-3">{doc.file_size_label}</td>
                    <td className="whitespace-nowrap px-3 py-3">{doc.created_label}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => handlePreview(doc)}
                          className="rounded-md border px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="inline h-3 w-3" /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          <Download className="inline h-3 w-3" /> Download
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => openEdit(doc)}
                            className="rounded-md border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                          >
                            <Pencil className="inline h-3 w-3" /> Edit
                          </button>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            disabled={busyId === doc.id}
                            onClick={() => handleDelete(doc.id)}
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

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
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

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleSave} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === "create" ? "Upload Document" : "Edit Document"}
              </h2>
              <button type="button" onClick={() => setModal(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Document name"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <select
                value={form.doc_type}
                onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {DOC_TYPES.filter((t) => admin || allowedTypes.includes(t.value)).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                value={form.file_name}
                onChange={(e) => setForm({ ...form, file_name: e.target.value })}
                placeholder="File name (e.g. report.pdf)"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={form.file_path}
                onChange={(e) => setForm({ ...form, file_path: e.target.value })}
                placeholder="File path / URL"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={form.uploaded_by}
                onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })}
                placeholder="Uploaded by"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="font-semibold text-slate-900">{preview.title}</h2>
                <p className="text-xs text-slate-500">{preview.file_name}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(preview)}
                  className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
                >
                  Download
                </button>
                <button type="button" onClick={() => setPreview(null)} className="rounded-lg p-1 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              {/\.(png|jpe?g|gif|webp)$/i.test(preview.file_name || preview.file_path || "") ? (
                <img
                  src={preview.file_path}
                  alt={preview.title}
                  className="mx-auto max-h-full max-w-full object-contain"
                />
              ) : (
                <iframe
                  title={preview.title}
                  src={preview.file_path}
                  className="h-full w-full rounded-lg bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
