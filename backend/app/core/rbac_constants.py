"""RBAC constants shared by permissions helpers and role seeding."""

MODULE_CATALOG = [
    {"code": "dashboard", "label": "Dashboard"},
    {"code": "masters", "label": "Masters"},
    {"code": "production", "label": "Production"},
    {"code": "inventory", "label": "Inventory & Raw Materials"},
    {"code": "procurement", "label": "Procurement"},
    {"code": "hr", "label": "HR & Employees"},
    {"code": "attendance", "label": "Attendance"},
    {"code": "sales", "label": "Sales & Billing"},
    {"code": "accounts", "label": "Accounts & Reports"},
    {"code": "quality", "label": "Quality Control"},
    {"code": "maintenance", "label": "Maintenance"},
    {"code": "analytics", "label": "Analytics"},
    {"code": "alerts", "label": "Alerts & Notifications"},
    {"code": "documents", "label": "Documents"},
    {"code": "factoryMonitor", "label": "Factory Monitor"},
    {"code": "iot", "label": "IoT & Smart Factory"},
    {"code": "settings", "label": "Settings"},
    {"code": "admin", "label": "Security & Administration"},
]

VALID_MODULES = {m["code"] for m in MODULE_CATALOG}

VALID_ACTIONS = frozenset({
    "read",
    "create",
    "update",
    "delete",
    "approve",
    "create_entry",
    "update_qty",
    "update_machine_status",
    "report_breakdown",
    "*",
})

# Canonical registerable role names (must match Role.name in DB).
REGISTERABLE_ROLES = [
    "Admin",
    "Production Manager",
    "Store Manager",
    "HR Manager",
    "Accountant",
    "Operator",
]

PERMISSION_MATRIX = {
    "Admin": {
        "modules": list(VALID_MODULES),
        "description": "Full access to all modules and actions.",
    },
    "Production Manager": {
        "modules": [
            "dashboard",
            "production",
            "quality",
            "analytics",
            "factoryMonitor",
            "alerts",
            "documents",
            "masters",
        ],
        "description": (
            "Dashboard, Production, Machines, Planning, Work Orders, Schedule, "
            "Shop Floor, Machine Allocation, Batch Tracking, Quality, Analytics."
        ),
    },
    "Store Manager": {
        "modules": [
            "dashboard",
            "inventory",
            "procurement",
            "masters",
            "alerts",
            "documents",
            "analytics",
        ],
        "description": (
            "Dashboard, Inventory, Products, Stock, Goods Receipt/Issue, "
            "Warehouse, Procurement, Inventory Reports."
        ),
    },
    "HR Manager": {
        "modules": ["dashboard", "hr", "attendance", "analytics", "alerts", "documents"],
        "description": "Dashboard, Employees, Attendance, Leave, Payroll, Recruitment, HR Reports.",
    },
    "Accountant": {
        "modules": [
            "dashboard",
            "accounts",
            "sales",
            "documents",
            "analytics",
            "alerts",
        ],
        "description": (
            "Dashboard, Finance, Sales/Purchase Payments, General Ledger, "
            "GST, Profit & Loss, Finance Reports."
        ),
    },
    "Operator": {
        "modules": [
            "dashboard",
            "production",
            "factoryMonitor",
            "attendance",
            "documents",
        ],
        "actions": [
            "production:read",
            "production:create_entry",
            "production:update_qty",
            "production:update_machine_status",
            "production:report_breakdown",
            "attendance:read",
            "documents:read",
        ],
        "description": (
            "Dashboard, Assigned Work Orders, Schedule, Shop Floor, "
            "Machine Allocation, Batch Tracking, Machine Status, Attendance. "
            "No Finance, HR admin, Settings, or Masters."
        ),
    },
}

# Sidebar menu catalog — filtered by role modules when building /api/sidebar.
SIDEBAR_MENU_CATALOG = [
    {
        "key": "dashboard",
        "label": "Dashboard",
        "path": "/",
        "module": "dashboard",
        "children": [],
    },
    {
        "key": "masters",
        "label": "Masters",
        "path": None,
        "module": "masters",
        "children": [
            {"label": "Products", "path": "/masters/products", "module": "masters"},
            {"label": "BOM", "path": "/masters/bom", "module": "masters"},
            {"label": "Customers", "path": "/sales/customers", "module": "sales"},
            {"label": "Vendors", "path": "/procurement/vendors", "module": "procurement"},
            {"label": "Warehouses", "path": "/inventory/warehouses", "module": "inventory"},
            {"label": "Machines", "path": "/production/machines", "module": "production"},
            {"label": "Departments", "path": "/masters/departments", "module": "hr"},
        ],
    },
    {
        "key": "production",
        "label": "Production",
        "path": None,
        "module": "production",
        "children": [
            {"label": "Production Planning", "path": "/production/planning", "module": "production"},
            {"label": "Work Orders", "path": "/production/work-orders", "module": "production"},
            {"label": "Production Schedule", "path": "/production/schedule", "module": "production"},
            {"label": "Shop Floor", "path": "/factory-monitor/live-production", "module": "factoryMonitor"},
            {"label": "Machine Allocation", "path": "/production/tasks", "module": "production"},
            {"label": "Batch Tracking", "path": "/production/batches", "module": "production"},
            {"label": "Machine Status", "path": "/production/machines", "module": "production"},
        ],
    },
    {
        "key": "inventory",
        "label": "Inventory",
        "path": None,
        "module": "inventory",
        "children": [
            {"label": "Raw Materials", "path": "/inventory/raw-materials", "module": "inventory"},
            {"label": "Finished Goods", "path": "/inventory/finished-goods", "module": "inventory"},
            {"label": "Stock Transfer", "path": "/inventory/stock-transfer", "module": "inventory"},
            {"label": "Stock Adjustment", "path": "/inventory/stock-adjustment", "module": "inventory"},
            {"label": "Stock Ledger", "path": "/inventory/stock-ledger", "module": "inventory"},
            {"label": "Warehouse", "path": "/inventory/warehouses", "module": "inventory"},
        ],
    },
    {
        "key": "procurement",
        "label": "Procurement",
        "path": None,
        "module": "procurement",
        "children": [
            {"label": "Purchase Request", "path": "/procurement/material-requests", "module": "procurement"},
            {"label": "RFQ", "path": "/procurement/rfq", "module": "procurement"},
            {"label": "Purchase Orders", "path": "/procurement/purchase-orders", "module": "procurement"},
            {"label": "Goods Receipt", "path": "/procurement/goods-receipt", "module": "procurement"},
            {"label": "Vendor Bills", "path": "/procurement/supplier-payments", "module": "procurement"},
        ],
    },
    {
        "key": "sales",
        "label": "Sales",
        "path": None,
        "module": "sales",
        "children": [
            {"label": "Leads", "path": "/sales/leads", "module": "sales"},
            {"label": "Quotations", "path": "/sales/quotations", "module": "sales"},
            {"label": "Sales Orders", "path": "/sales/orders", "module": "sales"},
            {"label": "Dispatch", "path": "/sales/dispatch", "module": "sales"},
            {"label": "Invoices", "path": "/sales/invoices", "module": "sales"},
        ],
    },
    {
        "key": "hr",
        "label": "HR",
        "path": None,
        "module": "hr",
        "children": [
            {"label": "HR Dashboard", "path": "/hr", "module": "hr"},
            {"label": "Employees", "path": "/hr/employees", "module": "hr"},
            {"label": "Attendance", "path": "/hr/attendance", "module": "attendance"},
            {"label": "Leave", "path": "/hr/leave", "module": "hr"},
            {"label": "Payroll", "path": "/hr/payroll", "module": "hr"},
            {"label": "Asset Management", "path": "/hr/assets", "module": "hr"},
            {"label": "Safety & Incidents", "path": "/hr/incidents", "module": "hr"},
            {"label": "HR Documents", "path": "/hr/documents", "module": "hr"},
        ],
    },
    {
        "key": "finance",
        "label": "Finance",
        "path": None,
        "module": "accounts",
        "children": [
            {"label": "Finance Dashboard", "path": "/accounts", "module": "accounts"},
            {"label": "Accounts Payable", "path": "/finance/accounts-payable", "module": "accounts"},
            {"label": "Accounts Receivable", "path": "/finance/accounts-receivable", "module": "accounts"},
            {"label": "Payment Tracking", "path": "/finance/payment-tracking", "module": "accounts"},
            {"label": "General Ledger", "path": "/finance/general-ledger", "module": "accounts"},
            {"label": "GST Reports", "path": "/accounts/tax-reports", "module": "accounts"},
            {"label": "Profit & Loss", "path": "/accounts/profit-loss", "module": "accounts"},
            {"label": "Balance Sheet", "path": "/accounts/balance-sheet", "module": "accounts"},
            {"label": "Journal Entries", "path": "/accounts/journal-entries", "module": "accounts"},
            {"label": "Chart of Accounts", "path": "/accounts/chart-of-accounts", "module": "accounts"},
            {"label": "Trial Balance", "path": "/accounts/trial-balance", "module": "accounts"},
            {"label": "Fixed Assets", "path": "/accounts/fixed-assets", "module": "accounts"},
            {"label": "Budget vs Actual", "path": "/accounts/budget-actual", "module": "accounts"},
        ],
    },
    {
        "key": "quality",
        "label": "Quality",
        "path": None,
        "module": "quality",
        "children": [
            {"label": "Incoming Inspection", "path": "/quality/incoming", "module": "quality"},
            {"label": "In-Process QC", "path": "/quality/in-process", "module": "quality"},
            {"label": "Final QC", "path": "/quality/final", "module": "quality"},
            {"label": "Defect Tracking", "path": "/quality/defects", "module": "quality"},
        ],
    },
    {
        "key": "maintenance",
        "label": "Maintenance",
        "path": None,
        "module": "maintenance",
        "children": [
            {"label": "Preventive", "path": "/maintenance/preventive", "module": "maintenance"},
            {"label": "Breakdowns", "path": "/maintenance/breakdowns", "module": "maintenance"},
            {"label": "Machine History", "path": "/maintenance/machine-history", "module": "maintenance"},
        ],
    },
    {
        "key": "alerts",
        "label": "Alerts",
        "path": None,
        "module": "alerts",
        "children": [
            {"label": "All Alerts", "path": "/alerts", "module": "alerts"},
            {"label": "Low Stock", "path": "/alerts/low-stock", "module": "alerts"},
            {"label": "Machine Failure", "path": "/alerts/machine-failure", "module": "alerts"},
            {"label": "Production Delay", "path": "/alerts/production-delay", "module": "alerts"},
            {"label": "Maintenance", "path": "/alerts/maintenance", "module": "alerts"},
        ],
    },
    {
        "key": "documents",
        "label": "Documents",
        "path": None,
        "module": "documents",
        "children": [
            {"label": "All Documents", "path": "/documents", "module": "documents"},
            {"label": "Purchase", "path": "/documents/purchase", "module": "documents"},
            {"label": "Production", "path": "/documents/production", "module": "documents"},
            {"label": "Quality", "path": "/documents/quality", "module": "documents"},
            {"label": "Reports", "path": "/documents/reports", "module": "documents"},
        ],
    },
    {
        "key": "analytics",
        "label": "Analytics",
        "path": None,
        "module": "analytics",
        "children": [
            {"label": "Production Analytics", "path": "/analytics/production", "module": "analytics"},
            {"label": "Inventory Analytics", "path": "/analytics/inventory", "module": "analytics"},
            {"label": "Sales Analytics", "path": "/analytics/sales", "module": "analytics"},
            {"label": "Finance Analytics", "path": "/analytics/finance", "module": "analytics"},
            {"label": "Executive Dashboard", "path": "/analytics/executive", "module": "analytics"},
        ],
    },
    {
        "key": "settings",
        "label": "Settings",
        "path": "/settings",
        "module": "settings",
        "children": [],
    },
    {
        "key": "admin",
        "label": "Administration",
        "path": None,
        "module": "admin",
        "children": [
            {"label": "Users", "path": "/admin/users", "module": "admin"},
            {"label": "Roles & Permissions", "path": "/admin/roles", "module": "admin"},
            {"label": "Access Logs", "path": "/admin/access-logs", "module": "admin"},
        ],
    },
]
