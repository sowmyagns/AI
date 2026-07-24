import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  FileDown,
  Layers,
  Package,
  PackageCheck,
  PackageMinus,
  PackageX,
  Plus,
  Upload,
} from "lucide-react";

import DataTable from "../../components/common/DataTable";
import Loader from "../../components/common/Loader";
import ProductDetailModal, { ProductFormModal } from "../../components/masters/ProductDetailModal";
import { useToast } from "../../context/ToastContext";
import useTenantId from "../../hooks/useTenantId";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../../api/productsApi";
import {
  BRANDS,
  DEMO_PRODUCTS,
  IMPORT_TEMPLATE_HEADERS,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCT_TYPES,
  WAREHOUSES,
  categoryChartData,
  computeQuickStats,
  computeSummary,
  enrichApiProduct,
} from "../../data/productsMasterData";
import { exportToExcel } from "../../utils/exportUtils";

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const active = status === 'active';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        active
          ? 'bg-green-100 text-green-700'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}

export default function ProductsMaster() {
  const { addToast } = useToast();
  const tenantId = useTenantId();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formProduct, setFormProduct] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    brand: "",
    product_type: "",
    status: "",
    warehouse: "",
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      const apiRows = res.data || [];
      setProducts(apiRows.map((row, i) => enrichApiProduct(row, i)));
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.brand && p.brand !== filters.brand) return false;
      if (filters.product_type && p.product_type !== filters.product_type) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.warehouse && p.warehouse !== filters.warehouse) return false;
      return true;
    });
  }, [products, filters]);

  const summary = useMemo(() => computeSummary(filteredProducts), [filteredProducts]);
  const quickStats = useMemo(() => computeQuickStats(filteredProducts), [filteredProducts]);

  const topSelling = useMemo(
    () => [...filteredProducts].sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0)).slice(0, 5),
    [filteredProducts]
  );

  const lowStockList = useMemo(
    () => filteredProducts.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock).slice(0, 5),
    [filteredProducts]
  );

  const recentProducts = useMemo(
    () => [...filteredProducts].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 5),
    [filteredProducts]
  );

  const exportColumns = [
    { key: "product_code", label: "Product Code" },
    { key: "name", label: "Product Name" },
    { key: "category", label: "Category" },
    { key: "sku", label: "SKU" },
    { key: "unit", label: "Unit" },
    { key: "selling_price", label: "Price" },
    { key: "current_stock", label: "Stock" },
    { key: "status", label: "Status" },
  ];

  const handleExport = () => {
    exportToExcel(filteredProducts, exportColumns, "products-master");
    addToast("Products exported to Excel");
  };

  const handleDownloadTemplate = () => {
    const row = IMPORT_TEMPLATE_HEADERS.join(",");
    const blob = new Blob([`${row}\nPRD006,Sample Product,Finished Goods,SKU-006,Nos,100,150,10,100,Main Store,active`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    addToast("Template downloaded");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = () => addToast("Import queued — map file columns in a future release", "info");
    input.click();
  };

  const handleSaveProduct = async (form) => {
    const payload = {
      tenant_id: tenantId,
      sku: form.sku,
      name: form.name,
      description: form.description || null,
      unit_cost: form.purchase_price ? Number(form.purchase_price) : null,
      unit_price: form.selling_price ? Number(form.selling_price) : null,
      min_stock: form.min_stock ? Number(form.min_stock) : 1,
      current_stock: form.current_stock ? Number(form.current_stock) : 1,
    };
    const code = `PRD${String(products.length + 1).padStart(3, "0")}`;

    try {
      if (formProduct?.id && typeof formProduct.id === "number") {
        await updateProduct(formProduct.id, payload);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === formProduct.id
              ? {
                  ...p,
                  ...form,
                  purchase_price: Number(form.purchase_price) || 0,
                  selling_price: Number(form.selling_price) || 0,
                  min_stock: Number(form.min_stock) || 1,
                  current_stock: Number(form.current_stock) || 1,
                }
              : p
          )
        );
        addToast("Product updated");
      } else {
        const result = await createProduct(payload);
        const newProduct = {
          ...enrichApiProduct({ id: result?.id ?? `new-${Date.now()}`, ...payload }, products.length),
          id: result?.id ?? `new-${Date.now()}`,
          product_code: code,
          ...form,
          purchase_price: Number(form.purchase_price) || 0,
          selling_price: Number(form.selling_price) || 0,
          min_stock: Number(form.min_stock) || 1,
          current_stock: Number(form.current_stock) || 1,
          created_at: new Date().toISOString().slice(0, 10),
        };
        setProducts((prev) => [newProduct, ...prev]);
        addToast("Product created");
      }
      setFormProduct(null);
    } catch (err) {
      const localId = `new-${Date.now()}`;
      const newProduct = {
        ...enrichApiProduct({ id: localId, ...payload }, products.length),
        id: localId,
        product_code: code,
        ...form,
        purchase_price: Number(form.purchase_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        min_stock: Number(form.min_stock) || 1,
        current_stock: Number(form.current_stock) || 1,
        created_at: new Date().toISOString().slice(0, 10),
      };
      if (formProduct?.id) {
        setProducts((prev) => prev.map((p) => (p.id === formProduct.id ? { ...p, ...newProduct, id: formProduct.id } : p)));
        addToast("Product updated locally");
      } else {
        setProducts((prev) => [newProduct, ...prev]);
        addToast("Product added locally");
      }
      setFormProduct(null);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try {
      if (typeof product.id === "number") {
        await deleteProduct(product.id);
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelected(null);
      addToast("Product deleted");
    } catch {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelected(null);
      addToast("Product removed");
    }
  };

  const handleDuplicate = (product) => {
    const copy = {
      ...product,
      id: `new-${Date.now()}`,
      product_code: `PRD${String(products.length + 1).padStart(3, "0")}`,
      name: `${product.name} (Copy)`,
      sku: `${product.sku}-COPY`,
    };
    setProducts((prev) => [...prev, copy]);
    setSelected(null);
    addToast("Product duplicated");
  };

  const clearFilters = () => setFilters({ category: "", brand: "", product_type: "", status: "", warehouse: "" });

  const columns = [
    { key: "product_code", label: "Product Code" },
    { key: "name", label: "Product Name" },
    { key: "category", label: "Category" },
    { key: "sku", label: "SKU" },
    { key: "unit", label: "Unit" },
    {
      key: "selling_price",
      label: "Price",
      render: (r) => `₹${Number(r.selling_price || 0).toLocaleString("en-IN")}`,
    },
    {
  key: "current_stock",
  label: "Stock",
  render: (r) => `${Number(r.current_stock || 0)} ${r.unit || ""}`.trim(),
},
     {
      key: "status",
      label: "Status",
      render: (r) => {
        const isActive = r.status === 'active';
        return (
          <select
            value={r.status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setProducts((prev) =>
                prev.map((p) =>
                  p.id === r.id ? { ...p, status: newStatus } : p
                )
              );
            }}
            // Dynamic classes applied here based on the isActive boolean
            className={`cursor-pointer rounded-full border-none px-2.5 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 ${
              isActive
                ? 'bg-green-100 text-green-700 focus:ring-green-500'
                : 'bg-red-100 text-red-700 focus:ring-red-500'
            }`}
          >
            {/* Setting option backgrounds to white so the dropdown menu stays readable */}
            <option value="active" className="bg-white text-slate-900">Active</option>
            <option value="inactive" className="bg-white text-slate-900">Inactive</option>
          </select>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setSelected(r)} className="text-xs font-semibold text-[#2563EB] hover:underline">View</button>
          <button type="button" onClick={() => setFormProduct(r)} className="text-xs font-semibold text-slate-600 hover:underline">Edit</button>
          <button type="button" onClick={() => handleDelete(r)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
        </div>
      ),
    },
  ];

  const tableFilters = [
    { key: "category", label: "Category", options: PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c })) },
    { key: "brand", label: "Brand", options: BRANDS.map((b) => ({ value: b, label: b })) },
    { key: "product_type", label: "Product Type", options: PRODUCT_TYPES.map((t) => ({ value: t, label: t })) },
    { key: "status", label: "Status", options: PRODUCT_STATUSES.map((s) => ({ value: s, label: s })) },
    { key: "warehouse", label: "Warehouse", options: WAREHOUSES.map((w) => ({ value: w, label: w })) },
  ];

  if (loading) return <Loader label="Loading products..." />;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products Master</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage all products, SKUs, pricing, categories, and inventory details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFormProduct({})} className="ui-btn-primary">
            <Plus className="h-4 w-4" /> Add Product
          </button>
          <button type="button" onClick={handleImport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Upload className="h-4 w-4" /> Import Products
          </button>
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Download className="h-4 w-4" /> Export Products
          </button>
          <button type="button" onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <FileDown className="h-4 w-4" /> Download Template
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total Products" value={summary.total} icon={Package} color="bg-[#2563EB]" />
        <SummaryCard label="Active Products" value={summary.active} icon={PackageCheck} color="bg-green-500" />
        <SummaryCard label="Inactive Products" value={summary.inactive} icon={PackageMinus} color="bg-slate-500" />
        <SummaryCard label="Low Stock Products" value={summary.lowStock} icon={PackageMinus} color="bg-orange-500" />
        <SummaryCard label="Out of Stock Products" value={summary.outOfStock} icon={PackageX} color="bg-red-500" />
        <SummaryCard label="Categories" value={summary.categories} icon={Layers} color="bg-purple-500" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {tableFilters.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{f.label}</span>
              <select
                value={filters[f.key]}
                onChange={(e) => setFilters((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[#2563EB] hover:underline">
            Clear Filters
          </button>
        </div>

        <DataTable
          columns={columns}
          data={filteredProducts}
          searchPlaceholder="Search Product"
          searchKeys={["product_code", "name", "category", "sku", "brand"]}
          filters={[]}
          pageSize={10}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Quick Statistics</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Most Sold Product</span><span className="font-semibold">{quickStats.mostSold}</span></li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Highest Stock</span><span className="font-semibold">{quickStats.highestStock}</span></li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Lowest Stock</span><span className="font-semibold">{quickStats.lowestStock}</span></li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Recently Added</span><span className="font-semibold">{quickStats.recentlyAdded}</span></li>
            <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Pending Approval</span><span className="font-semibold">{quickStats.pendingApproval}</span></li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Product Categories Chart</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2}>
                  {categoryChartData.map((e) => (
                    <Cell key={e.name} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Top Selling Products</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSelling} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="units_sold" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Stock Value</h3>
          <p className="text-3xl font-bold text-[#2563EB]">
            ₹{filteredProducts.reduce((s, p) => s + (p.stock_value || 0), 0).toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">Total inventory value across filtered products</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Low Stock Products</h3>
          <ul className="space-y-2 text-sm">
            {lowStockList.length === 0 ? (
              <li className="text-slate-400">No low stock items</li>
            ) : (
              lowStockList.map((p) => (
                <li key={p.id} className="flex justify-between rounded-lg bg-orange-50 px-3 py-2">
                  <span className="font-medium text-slate-700">{p.name}</span>
                  <span className="font-bold text-orange-600">{p.current_stock} {p.unit}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Recent Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2">Added</th>
              </tr>
            </thead>
            <tbody>
              {recentProducts.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-4 font-semibold text-[#2563EB]">{p.product_code}</td>
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{p.category}</td>
                  <td className="py-2 text-slate-500">{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
          onEdit={(p) => { setSelected(null); setFormProduct(p); }}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}

      {formProduct && (
        <ProductFormModal
          product={formProduct}
          onClose={() => setFormProduct(null)}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}
