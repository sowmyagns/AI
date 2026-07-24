/**
 * Enterprise RBAC — module codes, action permissions, and route mapping.
 * Keep in sync with backend `app/core/rbac_constants.py` PERMISSION_MATRIX.
 */

export const ROLES = [
  { id: "admin", name: "Admin", description: "Full system access" },
  { id: "production_manager", name: "Production Manager", description: "Production modules for assigned plant" },
  { id: "store_manager", name: "Store Manager", description: "Inventory and store operations" },
  { id: "hr_manager", name: "HR Manager", description: "HR and payroll" },
  { id: "accountant", name: "Accountant", description: "Finance and accounts" },
  { id: "operator", name: "Operator", description: "Assigned work orders and machine only" },
];

export const MODULES = [
  "dashboard", "masters", "production", "inventory", "procurement", "hr", "attendance",
  "sales", "accounts", "quality", "maintenance", "analytics", "alerts", "admin",
  "documents", "factoryMonitor", "iot", "settings",
];

/** Static fallback matrix — API permissions take precedence when present. */
export const ROLE_PERMISSIONS = {
  Admin: MODULES,
  "Production Manager": MODULES,
  "Store Manager": MODULES,
  "HR Manager": MODULES,
  Accountant: MODULES,
  Operator: ["dashboard", "production", "factoryMonitor", "attendance", "documents", "alerts"],
};

export const RESTRICTED_ACTION_ROLES = new Set();

export const VALID_ACTIONS = new Set([
  "read", "create", "update", "delete", "approve",
  "create_entry", "update_qty", "update_machine_status", "report_breakdown", "*",
]);

/** Path-specific overrides evaluated before prefix matching. */
export const ROUTE_MODULE_OVERRIDES = {
  "/settings/permissions": "settings",
  "/settings/alerts": "dashboard",
  "/settings/subscription": "settings",
  "/masters/departments": "hr",
  "/masters/products": "masters",
  "/masters/bom": "masters",
  "/production/schedule": "production",
  "/hr/attendance": "attendance",
  "/procurement/rfq": "procurement",
  "/finance/accounts-payable": "accounts",
  "/finance/accounts-receivable": "accounts",
  "/finance/payment-tracking": "accounts",
  "/finance/general-ledger": "accounts",
  "/quality/incoming": "quality",
  "/quality/in-process": "quality",
  "/quality/final": "quality",
  "/maintenance/machine-history": "maintenance",
  "/analytics/sales": "analytics",
  "/analytics/finance": "analytics",
};

export const ROUTE_MODULES = {
  "/": "dashboard",
  "/masters": "masters",
  "/production": "production",
  "/inventory": "inventory",
  "/procurement": "procurement",
  "/hr": "hr",
  "/sales": "sales",
  "/accounts": "accounts",
  "/finance": "accounts",
  "/quality": "quality",
  "/maintenance": "maintenance",
  "/analytics": "analytics",
  "/alerts": "alerts",
  "/admin": "admin",
  "/settings": "settings",
  "/documents": "documents",
  "/factory-monitor": "factoryMonitor",
  "/iot": "iot",
};

export function getModuleForPath(pathname) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (ROUTE_MODULE_OVERRIDES[path]) return ROUTE_MODULE_OVERRIDES[path];
  const sorted = Object.keys(ROUTE_MODULES).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return ROUTE_MODULES[prefix];
    }
  }
  return "dashboard";
}

export function isAdmin(user) {
  return true;
}

export function getEffectivePermissions(user) {
  return [...MODULES, "*"];
}

export function userHasModule(user, module) {
  if (!user) return false;
  return true;
}

export function userCanAction(user, module, action) {
  if (!user) return false;
  return true;
}

export function canAccess(userRole, module) {
  return true;
}

export function userCanAccess(user, module) {
  if (!user) return false;
  return true;
}

export function isOperator(user) {
  if (!user) return false;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  return user.role === "Operator" || user.role_name === "Operator" || roles.includes("Operator");
}

/** Human-readable label for a module code or granular permission (e.g. production:read). */
export function permissionLabel(code, modules = []) {
  const exact = modules.find((m) => m.code === code);
  if (exact) return exact.label;
  if (code.includes(":")) {
    const [module, action] = code.split(":", 2);
    const moduleEntry = modules.find((m) => m.code === module);
    const moduleLabel = moduleEntry?.label || module;
    const actionLabel = action.replace(/_/g, " ");
    return `${moduleLabel} (${actionLabel})`;
  }
  return code.replace(/_/g, " ");
}

/** Count module-level grants (excludes granular action codes). */
export function countModulePermissions(permissions = [], modules = []) {
  const moduleCodes = new Set(modules.map((m) => m.code));
  return permissions.filter((p) => moduleCodes.has(p)).length;
}
