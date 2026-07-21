import {
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  Factory,
  FolderOpen,
  Landmark,
  Layers,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

/**
 * GNS Insights sidebar structure. Children are filtered by RBAC per-item `module`.
 * Routes map to existing pages where available; others use /erp/* placeholders.
 */
export const SIDEBAR_NAV = [
  {
    key: "dashboard",
    labelKey: "erpNav.dashboard",
    to: "/",
    icon: LayoutDashboard,
    module: "dashboard",
    end: true,
  },
  {
    key: "masters",
    labelKey: "erpNav.masters",
    icon: Layers,
    children: [
      { labelKey: "erpNav.products", to: "/masters/products", module: "masters" },
      { labelKey: "erpNav.bom", to: "/masters/bom", module: "masters" },
      { labelKey: "erpNav.customers", to: "/sales/customers", module: "sales" },
      { labelKey: "erpNav.vendors", to: "/procurement/vendors", module: "procurement" },
      { labelKey: "erpNav.warehouses", to: "/inventory/warehouses", module: "inventory" },
      { labelKey: "erpNav.machines", to: "/production/machines", module: "production" },
      { labelKey: "erpNav.departments", to: "/masters/departments", module: "hr" },
    ],
  },
  {
    key: "production",
    labelKey: "erpNav.production",
    icon: Factory,
    children: [
      { labelKey: "erpNav.productionPlanning", to: "/production/planning", module: "production" },
      { labelKey: "erpNav.workOrders", to: "/production/work-orders", module: "production" },
      { labelKey: "erpNav.productionSchedule", to: "/production/schedule", module: "production" },
      { labelKey: "erpNav.shopFloor", to: "/factory-monitor/live-production", module: "factoryMonitor" },
      { labelKey: "erpNav.machineAllocation", to: "/production/tasks", module: "production" },
      { labelKey: "erpNav.batchTracking", to: "/production/batches", module: "production" },
    ],
  },
  {
    key: "inventory",
    labelKey: "erpNav.inventory",
    icon: Boxes,
    children: [
      { labelKey: "erpNav.rawMaterials", to: "/inventory/raw-materials", module: "inventory" },
      { labelKey: "erpNav.finishedGoods", to: "/inventory/finished-goods", module: "inventory" },
      { labelKey: "erpNav.stockTransfer", to: "/inventory/stock-transfer", module: "inventory" },
      { labelKey: "erpNav.stockAdjustment", to: "/inventory/stock-adjustment", module: "inventory" },
      { labelKey: "erpNav.stockLedger", to: "/inventory/stock-ledger", module: "inventory" },
    ],
  },
  {
    key: "procurement",
    labelKey: "erpNav.procurement",
    icon: ShoppingCart,
    children: [
      { labelKey: "erpNav.purchaseRequest", to: "/procurement/material-requests", module: "procurement" },
      { labelKey: "erpNav.rfq", to: "/procurement/rfq", module: "procurement" },
      { labelKey: "erpNav.purchaseOrders", to: "/procurement/purchase-orders", module: "procurement" },
      { labelKey: "erpNav.grn", to: "/procurement/goods-receipt", module: "procurement" },
      { labelKey: "erpNav.vendorBills", to: "/procurement/supplier-payments", module: "procurement" },
    ],
  },
  {
    key: "sales",
    labelKey: "erpNav.sales",
    icon: Wallet,
    children: [
      { labelKey: "erpNav.salesDashboard", to: "/sales/dashboard", module: "sales" },
      { labelKey: "erpNav.leads", to: "/sales/leads", module: "sales" },
      { labelKey: "erpNav.quotations", to: "/sales/quotations", module: "sales" },
      { labelKey: "erpNav.salesOrders", to: "/sales/orders", module: "sales" },
      { labelKey: "erpNav.dispatch", to: "/sales/dispatch", module: "sales" },
      { labelKey: "erpNav.invoices", to: "/sales/invoices", module: "sales" },
    ],
  },
  {
    key: "hr",
    labelKey: "erpNav.hr",
    icon: Users,
    children: [
      { labelKey: "erpNav.hrDashboard", to: "/hr", module: "hr" },
      { labelKey: "erpNav.employees", to: "/hr/employees", module: "hr" },
      { labelKey: "erpNav.attendance", to: "/hr/attendance", module: "attendance" },
      { labelKey: "erpNav.leave", to: "/hr/leave", module: "hr" },
      { labelKey: "erpNav.payroll", to: "/hr/payroll", module: "hr" },
    ],
  },
  {
    key: "finance",
    labelKey: "erpNav.finance",
    icon: Landmark,
    children: [
      { labelKey: "erpNav.financeDashboard", to: "/accounts", module: "accounts" },
      { labelKey: "erpNav.accountsPayable", to: "/finance/accounts-payable", module: "accounts" },
      { labelKey: "erpNav.accountsReceivable", to: "/finance/accounts-receivable", module: "accounts" },
      { labelKey: "erpNav.paymentTracking", to: "/finance/payment-tracking", module: "accounts" },
      { labelKey: "erpNav.generalLedger", to: "/finance/general-ledger", module: "accounts" },
      { labelKey: "erpNav.gstReports", to: "/accounts/tax-reports", module: "accounts" },
      { labelKey: "erpNav.profitLoss", to: "/accounts/profit-loss", module: "accounts" },
    ],
  },
  {
    key: "quality",
    labelKey: "erpNav.quality",
    icon: CheckCircle2,
    children: [
      { labelKey: "erpNav.qualityDashboard", to: "/quality", module: "quality" },
      { labelKey: "erpNav.incomingInspection", to: "/quality/incoming", module: "quality" },
      { labelKey: "erpNav.inProcessQc", to: "/quality/in-process", module: "quality" },
      { labelKey: "erpNav.finalQc", to: "/quality/final", module: "quality" },
      { labelKey: "erpNav.batchReports", to: "/quality/batch-reports", module: "quality" },
      { labelKey: "erpNav.rejections", to: "/quality/defects", module: "quality" },
    ],
  },
  {
    key: "maintenance",
    labelKey: "erpNav.maintenance",
    icon: Wrench,
    children: [
      { labelKey: "erpNav.maintenanceDashboard", to: "/maintenance", module: "maintenance" },
      { labelKey: "erpNav.preventiveMaintenance", to: "/maintenance/preventive", module: "maintenance" },
      { labelKey: "erpNav.breakdownMaintenance", to: "/maintenance/breakdowns", module: "maintenance" },
      { labelKey: "erpNav.machineHistory", to: "/maintenance/machine-history", module: "maintenance" },
      { labelKey: "erpNav.maintenanceSchedule", to: "/maintenance/schedule", module: "maintenance" },
    ],
  },
  {
    key: "alerts",
    labelKey: "erpNav.alerts",
    icon: Bell,
    children: [
      { labelKey: "erpNav.allAlerts", to: "/alerts", module: "alerts", end: true },
      { labelKey: "erpNav.lowStockAlerts", to: "/alerts/low-stock", module: "alerts" },
      { labelKey: "erpNav.machineFailureAlerts", to: "/alerts/machine-failure", module: "alerts" },
      { labelKey: "erpNav.productionDelayAlerts", to: "/alerts/production-delay", module: "alerts" },
      { labelKey: "erpNav.maintenanceAlerts", to: "/alerts/maintenance", module: "alerts" },
    ],
  },
  {
    key: "documents",
    labelKey: "erpNav.documents",
    icon: FolderOpen,
    children: [
      { labelKey: "erpNav.allDocuments", to: "/documents", module: "documents", end: true },
      { labelKey: "erpNav.purchaseDocuments", to: "/documents/purchase", module: "documents" },
      { labelKey: "erpNav.productionDocuments", to: "/documents/production", module: "documents" },
      { labelKey: "erpNav.qualityDocuments", to: "/documents/quality", module: "documents" },
      { labelKey: "erpNav.reportDocuments", to: "/documents/reports", module: "documents" },
    ],
  },
  {
    key: "analytics",
    labelKey: "erpNav.analytics",
    icon: BarChart3,
    children: [
      { labelKey: "erpNav.executiveDashboard", to: "/analytics/executive", module: "analytics" },
      { labelKey: "erpNav.liveDashboard", to: "/analytics/live", module: "analytics" },
      { labelKey: "erpNav.productionKpi", to: "/analytics/production", module: "analytics" },
      { labelKey: "erpNav.inventoryKpi", to: "/analytics/inventory", module: "analytics" },
      { labelKey: "erpNav.salesKpi", to: "/analytics/sales", module: "analytics" },
      { labelKey: "erpNav.financeKpi", to: "/analytics/finance", module: "analytics" },
    ],
  },
  {
    key: "settings",
    labelKey: "erpNav.settings",
    icon: Settings,
    children: [
      { labelKey: "erpNav.settings", to: "/settings", module: "settings", end: true },
      { labelKey: "erpNav.users", to: "/admin/users", module: "settings" },
      { labelKey: "erpNav.roles", to: "/admin/roles", module: "settings" },
      { labelKey: "erpNav.permissions", to: "/admin/permissions", module: "settings" },
      { labelKey: "erpNav.auditLogs", to: "/admin/audit-logs", module: "admin" },
    ],
  },
];

export function isPathActive(pathname, to, end = false) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function sectionHasActiveChild(pathname, section) {
  if (!section.children) return false;
  return section.children.some((c) => isPathActive(pathname, c.to, c.end));
}

/** Flat list of navigable routes for global search (path, label, module, optional section). */
export function flattenNavForSearch() {
  const items = [];
  for (const section of SIDEBAR_NAV) {
    if (section.to) {
      items.push({
        path: section.to,
        labelKey: section.labelKey,
        module: section.module,
        sectionKey: null,
      });
    }
    if (section.children) {
      for (const child of section.children) {
        items.push({
          path: child.to,
          labelKey: child.labelKey,
          module: child.module,
          sectionKey: section.labelKey,
        });
      }
    }
  }
  return items;
}
