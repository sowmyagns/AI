import { isAdmin } from "../config/permissions";

export const DOC_TYPES = [
  { value: "purchase", label: "Purchase / Inventory" },
  { value: "production", label: "Production" },
  { value: "quality", label: "Quality" },
  { value: "report", label: "Finance / Reports" },
  { value: "hr", label: "HR" },
  { value: "general", label: "General" },
];

export function getAllowedDocTypes(user) {
  if (!user) return [];
  if (isAdmin(user)) return DOC_TYPES.map((d) => d.value);
  const role = user.role_name || user.role || "";
  const map = {
    Admin: DOC_TYPES.map((d) => d.value),
    "Production Manager": ["production", "quality"],
    "Store Manager": ["purchase"],
    "HR Manager": ["hr", "general"],
    Accountant: ["purchase", "report", "general"],
    Finance: ["purchase", "report", "general"],
    Quality: ["quality"],
    "Quality Manager": ["quality"],
    Operator: ["production", "purchase", "quality", "report", "hr", "general"],
  };
  return map[role] || [];
}

export function canWriteDocuments(user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const role = user.role_name || user.role || "";
  return role !== "Operator";
}

export function fileExtension(name = "") {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function fileTypeCategory(name = "") {
  const ext = fileExtension(name);
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["xlsx", "xls", "csv"].includes(ext)) return "excel";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (ext === "zip") return "zip";
  return "other";
}

export const FILE_TYPE_LABELS = {
  pdf: "PDF",
  image: "Images",
  excel: "Excel",
  word: "Word",
  ppt: "PowerPoint",
  zip: "ZIP",
  other: "Other",
};

export function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function computeDocumentSummary(documents = []) {
  const summary = {
    total: documents.length,
    pdf: 0,
    image: 0,
    excel: 0,
    word: 0,
    recent: 0,
    storageBytes: 0,
  };
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  documents.forEach((d) => {
    const cat = fileTypeCategory(d.file_name || d.title);
    if (cat === "pdf") summary.pdf += 1;
    if (cat === "image") summary.image += 1;
    if (cat === "excel") summary.excel += 1;
    if (cat === "word") summary.word += 1;
    if (d.created_at && new Date(d.created_at).getTime() >= weekAgo) summary.recent += 1;
    if (d.file_size) summary.storageBytes += Number(d.file_size) || 0;
  });
  return summary;
}
