import { Navigate, Route, Routes } from "react-router-dom";

import PlaceholderPage from "../components/common/PlaceholderPage";
import ProtectedRoute from "../components/layout/ProtectedRoute";
/* Pages are lazy-loaded via lazyPages – see vite.config manualChunks for vendor splits */
import * as P from "./lazyPages";
import LiveProduction from "../pages/factoryMonitor/LiveProduction";
import MachineStatus from "../pages/factoryMonitor/MachineStatus";
import ProductionLines from "../pages/factoryMonitor/ProductionLines";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/landing" element={<P.Landing />} />
      <Route path="/login" element={<P.Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/gns-admin/login" element={<P.SuperAdminLogin />} />
      <Route path="/gns-admin/verify-otp" element={<P.SuperAdminVerifyOtp />} />
      <Route path="/gns-admin" element={<P.SuperAdminDashboard />} />
      <Route path="/gns-admin/companies/new" element={<P.CreateCompany />} />
      <Route path="/gns-admin/companies/:tenantId" element={<P.CompanyDetail />} />
      <Route path="/forgot-password" element={<P.ForgotPassword />} />
      <Route path="/reset-password" element={<P.ResetPassword />} />
      <Route path="/verify-email" element={<P.VerifyEmail />} />
      <Route path="/" element={<ProtectedRoute><P.Dashboard /></ProtectedRoute>} />

      {/* Production */}
      <Route path="/production" element={<ProtectedRoute><P.ProductionDashboard /></ProtectedRoute>} />
      <Route path="/production/dashboard" element={<ProtectedRoute><P.ProductionDashboard /></ProtectedRoute>} />
      <Route path="/production/planning" element={<ProtectedRoute><P.ProductionPlanning /></ProtectedRoute>} />
      <Route path="/production/work-orders" element={<ProtectedRoute><P.WorkOrders /></ProtectedRoute>} />
      <Route path="/production/batches" element={<ProtectedRoute><P.BatchTracking /></ProtectedRoute>} />
      <Route path="/production/machines" element={<ProtectedRoute><P.MachineStatus /></ProtectedRoute>} />
      <Route path="/production/machines/create" element={<ProtectedRoute><P.CreateMachine /></ProtectedRoute>} />
      <Route path="/production/reports" element={<ProtectedRoute><P.DailyReports /></ProtectedRoute>} />
      <Route path="/production/create" element={<ProtectedRoute><P.CreateProduction /></ProtectedRoute>} />
      <Route path="/production/work-orders/create-quick" element={<ProtectedRoute><P.QuickCreateWorkOrder /></ProtectedRoute>} />
      <Route path="/production/tasks" element={<ProtectedRoute><P.MachineAllocation /></ProtectedRoute>} />
      <Route path="/production/schedule" element={<ProtectedRoute><P.ProductionSchedule /></ProtectedRoute>} />

      {/* Inventory */}
      <Route path="/inventory" element={<ProtectedRoute><P.InventoryDashboard /></ProtectedRoute>} />
      <Route path="/inventory/items" element={<Navigate to="/inventory/raw-materials" replace />} />
      <Route path="/inventory/raw-materials" element={<ProtectedRoute><P.RawMaterials /></ProtectedRoute>} />
      <Route path="/inventory/finished-goods" element={<ProtectedRoute><P.FinishedGoods /></ProtectedRoute>} />
      <Route path="/inventory/stock-transfer" element={<ProtectedRoute><P.StockTransfer /></ProtectedRoute>} />
      <Route path="/inventory/stock-adjustment" element={<ProtectedRoute><P.StockAdjustment /></ProtectedRoute>} />
      <Route path="/inventory/stock-ledger" element={<ProtectedRoute><P.StockLedger /></ProtectedRoute>} />
      <Route path="/inventory/items/create" element={<ProtectedRoute><P.CreateItem /></ProtectedRoute>} />
      <Route path="/inventory/stock-movement" element={<ProtectedRoute><P.StockMovement /></ProtectedRoute>} />
      <Route path="/inventory/warehouses" element={<ProtectedRoute><P.Warehouses /></ProtectedRoute>} />
      <Route path="/inventory/suppliers" element={<ProtectedRoute><P.Suppliers /></ProtectedRoute>} />
      <Route path="/inventory/warehouses/create" element={<ProtectedRoute><P.CreateWarehouse /></ProtectedRoute>} />
      <Route path="/inventory/suppliers/create" element={<ProtectedRoute><P.CreateSupplier /></ProtectedRoute>} />

      {/* HR */}
      <Route path="/hr" element={<ProtectedRoute><P.HRDashboard /></ProtectedRoute>} />
      <Route path="/hr/attendance" element={<ProtectedRoute><P.Attendance /></ProtectedRoute>} />
      <Route path="/hr/leave" element={<ProtectedRoute><P.Leave /></ProtectedRoute>} />
      <Route path="/hr/leave/create" element={<ProtectedRoute><P.CreateLeave /></ProtectedRoute>} />
      <Route path="/hr/shifts" element={<ProtectedRoute><P.Shifts /></ProtectedRoute>} />
      <Route path="/hr/shifts/create" element={<ProtectedRoute><P.CreateShift /></ProtectedRoute>} />
      <Route path="/hr/payroll" element={<ProtectedRoute><P.Payroll /></ProtectedRoute>} />
      <Route path="/hr/payroll/create" element={<ProtectedRoute><P.CreatePayroll /></ProtectedRoute>} />
      <Route path="/hr/performance" element={<ProtectedRoute><P.Performance /></ProtectedRoute>} />
      <Route path="/hr/performance/create" element={<ProtectedRoute><P.CreatePerformance /></ProtectedRoute>} />
      <Route path="/hr/employees" element={<ProtectedRoute><P.Employees /></ProtectedRoute>} />
      <Route path="/hr/employees/create" element={<ProtectedRoute><P.CreateEmployee /></ProtectedRoute>} />
      <Route path="/hr/assets" element={<ProtectedRoute><P.AssetManagement /></ProtectedRoute>} />
      <Route path="/hr/assets/create" element={<ProtectedRoute><P.CreateAsset /></ProtectedRoute>} />
      <Route path="/hr/incidents" element={<ProtectedRoute><P.IncidentReports /></ProtectedRoute>} />
      <Route path="/hr/incidents/create" element={<ProtectedRoute><P.CreateIncident /></ProtectedRoute>} />
      <Route path="/hr/documents" element={<ProtectedRoute><P.HRDocuments /></ProtectedRoute>} />

      {/* Sales */}
      <Route path="/sales/dashboard" element={<ProtectedRoute><P.SalesDashboard /></ProtectedRoute>} />
      <Route path="/sales/leads" element={<ProtectedRoute><P.Leads /></ProtectedRoute>} />
      <Route path="/sales/quotations" element={<ProtectedRoute><P.Quotations /></ProtectedRoute>} />
      <Route path="/sales/dispatch" element={<ProtectedRoute><P.Dispatch /></ProtectedRoute>} />
      <Route path="/sales/invoices" element={<ProtectedRoute><P.InvoiceDashboard /></ProtectedRoute>} />
      <Route path="/sales/invoices/copy" element={<ProtectedRoute><P.InvoiceCopyPage /></ProtectedRoute>} />
      <Route path="/sales/invoices/:id/copy" element={<ProtectedRoute><P.InvoiceCopyPage /></ProtectedRoute>} />
      <Route path="/sales/invoices/create" element={<ProtectedRoute><P.TaxInvoiceForm /></ProtectedRoute>} />
      <Route path="/sales/orders" element={<ProtectedRoute><P.SalesOrders /></ProtectedRoute>} />
      <Route path="/sales/orders/create" element={<ProtectedRoute><P.CreateSalesOrder /></ProtectedRoute>} />
      <Route path="/sales/orders/:id" element={<ProtectedRoute><P.SalesOrderDetail /></ProtectedRoute>} />
      <Route path="/sales/customers" element={<ProtectedRoute><P.Customers /></ProtectedRoute>} />
      <Route path="/sales/customers/create" element={<ProtectedRoute><P.CreateCustomer /></ProtectedRoute>} />
      <Route path="/sales/payments" element={<ProtectedRoute><P.PaymentTracking /></ProtectedRoute>} />
      <Route path="/sales/payments/create" element={<ProtectedRoute><P.CreatePayment /></ProtectedRoute>} />

      {/* Accounts */}
      <Route path="/accounts" element={<ProtectedRoute><P.AccountsDashboard /></ProtectedRoute>} />
      <Route path="/accounts/profit-loss" element={<ProtectedRoute><P.ProfitLoss /></ProtectedRoute>} />
      <Route path="/accounts/expenses" element={<ProtectedRoute><P.ExpenseTracking /></ProtectedRoute>} />
      <Route path="/accounts/expenses/record" element={<ProtectedRoute><P.RecordExpense /></ProtectedRoute>} />
      <Route path="/accounts/tax-reports" element={<ProtectedRoute><P.TaxReports /></ProtectedRoute>} />
      <Route path="/accounts/income/record" element={<ProtectedRoute><P.RecordIncome /></ProtectedRoute>} />
      <Route path="/accounts/balance-sheet" element={<ProtectedRoute><P.BalanceSheet /></ProtectedRoute>} />
      <Route path="/accounts/journal-entries" element={<ProtectedRoute><P.JournalEntries /></ProtectedRoute>} />
      <Route path="/accounts/chart-of-accounts" element={<ProtectedRoute><P.ChartOfAccounts /></ProtectedRoute>} />
      <Route path="/accounts/trial-balance" element={<ProtectedRoute><P.TrialBalance /></ProtectedRoute>} />
      <Route path="/accounts/budget-actual" element={<ProtectedRoute><P.BudgetActual /></ProtectedRoute>} />
      <Route path="/accounts/cost-allocation" element={<ProtectedRoute><P.CostAllocation /></ProtectedRoute>} />
      <Route path="/accounts/fixed-assets" element={<ProtectedRoute><P.FixedAssets /></ProtectedRoute>} />
      <Route path="/accounts/multi-branch-ledger" element={<ProtectedRoute><P.MultiBranchLedger /></ProtectedRoute>} />
      <Route path="/accounts/year-closing" element={<ProtectedRoute><P.YearClosing /></ProtectedRoute>} />

      {/* Finance (legacy aliases) */}
      <Route path="/finance" element={<ProtectedRoute><Navigate to="/accounts" replace /></ProtectedRoute>} />
      <Route path="/finance/accounts-payable" element={<ProtectedRoute><P.AccountsPayable /></ProtectedRoute>} />
      <Route path="/finance/accounts-receivable" element={<ProtectedRoute><P.AccountsReceivable /></ProtectedRoute>} />
      <Route path="/finance/payment-tracking" element={<ProtectedRoute><P.PaymentTracking /></ProtectedRoute>} />
      <Route path="/finance/general-ledger" element={<ProtectedRoute><P.GeneralLedger /></ProtectedRoute>} />

      {/* Procurement */}
      <Route path="/procurement/purchase-orders" element={<ProtectedRoute><P.PurchaseOrders /></ProtectedRoute>} />
      <Route path="/procurement/purchase-orders/create" element={<ProtectedRoute><P.CreatePurchaseOrder /></ProtectedRoute>} />
      <Route path="/procurement/vendors" element={<ProtectedRoute><P.VendorManagement /></ProtectedRoute>} />
      <Route path="/procurement/vendors/create" element={<ProtectedRoute><P.CreateVendor /></ProtectedRoute>} />
      <Route path="/procurement/material-requests" element={<ProtectedRoute><P.MaterialRequests /></ProtectedRoute>} />
      <Route path="/procurement/material-requests/create" element={<ProtectedRoute><P.CreateMaterialRequest /></ProtectedRoute>} />
      <Route path="/procurement/goods-receipt" element={<ProtectedRoute><P.GoodsReceipt /></ProtectedRoute>} />
      <Route path="/procurement/goods-receipt/create" element={<ProtectedRoute><P.CreateGoodsReceipt /></ProtectedRoute>} />
      <Route path="/procurement/supplier-payments" element={<ProtectedRoute><P.SupplierPayments /></ProtectedRoute>} />
      <Route path="/procurement/supplier-payments/create" element={<ProtectedRoute><P.CreateSupplierPayment /></ProtectedRoute>} />
      <Route path="/procurement/supply-chain" element={<ProtectedRoute><P.SupplyChainDashboard /></ProtectedRoute>} />
      <Route path="/procurement/rfq" element={<ProtectedRoute><P.RFQ /></ProtectedRoute>} />

      {/* Quality */}
      <Route path="/quality" element={<ProtectedRoute><P.QualityDashboard /></ProtectedRoute>} />
      <Route path="/quality/incoming" element={<ProtectedRoute><P.IncomingInspection /></ProtectedRoute>} />
      <Route path="/quality/in-process" element={<ProtectedRoute><P.InProcessQC /></ProtectedRoute>} />
      <Route path="/quality/final" element={<ProtectedRoute><P.FinalQC /></ProtectedRoute>} />
      <Route path="/quality/inspection" element={<ProtectedRoute><P.QualityInspection /></ProtectedRoute>} />
      <Route path="/quality/defects" element={<ProtectedRoute><P.DefectTracking /></ProtectedRoute>} />
      <Route path="/quality/batch-reports" element={<ProtectedRoute><P.BatchQualityReports /></ProtectedRoute>} />
      <Route path="/quality/compliance" element={<ProtectedRoute><P.ComplianceLogs /></ProtectedRoute>} />

      {/* Maintenance */}
      <Route path="/maintenance" element={<ProtectedRoute><P.MaintenanceDashboard /></ProtectedRoute>} />
      <Route path="/maintenance/machines" element={<ProtectedRoute><P.MachineMaintenance /></ProtectedRoute>} />
      <Route path="/maintenance/preventive" element={<ProtectedRoute><P.PreventiveMaintenance /></ProtectedRoute>} />
      <Route path="/maintenance/breakdowns" element={<ProtectedRoute><P.BreakdownReports /></ProtectedRoute>} />
      <Route path="/maintenance/machine-history" element={<ProtectedRoute><P.MachineHistory /></ProtectedRoute>} />
      <Route path="/maintenance/schedule" element={<ProtectedRoute><P.MaintenanceSchedule /></ProtectedRoute>} />

      {/* Analytics */}
      <Route path="/analytics" element={<ProtectedRoute><P.ExecutiveDashboard /></ProtectedRoute>} />
      <Route path="/analytics/executive" element={<ProtectedRoute><P.ExecutiveDashboard /></ProtectedRoute>} />
      <Route path="/analytics/live" element={<ProtectedRoute><P.LiveDashboard /></ProtectedRoute>} />
      <Route path="/analytics/production" element={<ProtectedRoute><P.ProductionAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/machine-efficiency" element={<ProtectedRoute><P.MachineEfficiency /></ProtectedRoute>} />
      <Route path="/analytics/inventory" element={<ProtectedRoute><P.InventoryAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/sales" element={<ProtectedRoute><P.SalesAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/finance" element={<ProtectedRoute><P.FinanceAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/profit" element={<ProtectedRoute><P.ProfitAnalysis /></ProtectedRoute>} />
      <Route path="/analytics/forecasting" element={<ProtectedRoute><P.ForecastingDashboard /></ProtectedRoute>} />

      {/* Alerts */}
      <Route path="/alerts" element={<ProtectedRoute><P.AllAlerts /></ProtectedRoute>} />
      <Route path="/alerts/low-stock" element={<ProtectedRoute><P.LowStockAlerts /></ProtectedRoute>} />
      <Route path="/alerts/machine-failure" element={<ProtectedRoute><P.MachineFailureAlerts /></ProtectedRoute>} />
      <Route path="/alerts/production-delay" element={<ProtectedRoute><P.ProductionDelayAlerts /></ProtectedRoute>} />
      <Route path="/alerts/maintenance" element={<ProtectedRoute><P.MaintenanceReminders /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin/users" element={<ProtectedRoute><P.UserManagement /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute><P.RolesPermissions /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute><P.RolesPermissions /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute><P.AccessLogs /></ProtectedRoute>} />
      <Route path="/admin/access-logs" element={<Navigate to="/admin/audit-logs" replace />} />
      <Route path="/admin/integrations" element={<ProtectedRoute><P.IntegrationsDashboard /></ProtectedRoute>} />

      {/* Documents */}
      <Route path="/documents/purchase" element={<ProtectedRoute><P.PurchaseDocuments /></ProtectedRoute>} />
      <Route path="/documents/production" element={<ProtectedRoute><P.ProductionFiles /></ProtectedRoute>} />
      <Route path="/documents/quality" element={<ProtectedRoute><P.QualityCertificates /></ProtectedRoute>} />
      <Route path="/documents/reports" element={<ProtectedRoute><P.ReportsArchive /></ProtectedRoute>} />

      {/* Settings */}
      <Route path="/settings" element={<ProtectedRoute><P.SettingsLayout /></ProtectedRoute>}>
        <Route index element={<P.SettingsHome />} />
        <Route path=":sectionId" element={<P.SettingsSectionPage />} />
        <Route path="addresses/billing" element={<Navigate to="/settings/company" replace />} />
        <Route path="addresses/delivery" element={<Navigate to="/settings/inventory" replace />} />
        <Route path="accounts/*" element={<Navigate to="/settings/finance" replace />} />
        <Route path="documents/*" element={<Navigate to="/settings/documents" replace />} />
      </Route>

      {/* Masters */}
      <Route path="/masters/products" element={<ProtectedRoute><P.ProductsMaster /></ProtectedRoute>} />
      <Route path="/masters/bom" element={<ProtectedRoute><P.BomMaster /></ProtectedRoute>} />
      <Route path="/masters/departments" element={<ProtectedRoute><P.DepartmentManagement /></ProtectedRoute>} />

      {/* Factory Monitor */}
      <Route path="/factory-monitor/live-production" element={<ProtectedRoute><LiveProduction /></ProtectedRoute>} />
      <Route path="/factory-monitor/machine-status" element={<ProtectedRoute><MachineStatus /></ProtectedRoute>} />
      <Route path="/factory-monitor/production-lines" element={<ProtectedRoute><ProductionLines /></ProtectedRoute>} />

      {/* IoT */}
      <Route path="/iot" element={<ProtectedRoute><P.IotDashboard /></ProtectedRoute>} />
      <Route path="/iot/wearables" element={<ProtectedRoute><P.Wearables /></ProtectedRoute>} />
      <Route path="/iot/machine-analytics" element={<ProtectedRoute><P.MachineAnalytics /></ProtectedRoute>} />
      <Route path="/iot/sensors" element={<ProtectedRoute><P.Sensors /></ProtectedRoute>} />
      <Route path="/iot/cobots" element={<ProtectedRoute><P.Cobots /></ProtectedRoute>} />
      <Route path="/iot/agvs" element={<ProtectedRoute><P.Agvs /></ProtectedRoute>} />
      <Route path="/iot/drones" element={<ProtectedRoute><P.Drones /></ProtectedRoute>} />
      <Route path="/iot/smart-packaging" element={<ProtectedRoute><P.SmartPackaging /></ProtectedRoute>} />
      <Route path="/iot/live-operations" element={<ProtectedRoute><P.LiveOperations /></ProtectedRoute>} />

      <Route path="*" element={<P.NotFound />} />
    </Routes>
  );
}

import { Navigate, Route, Routes } from "react-router-dom";

import PlaceholderPage from "../components/common/PlaceholderPage";
import ProtectedRoute from "../components/layout/ProtectedRoute";
/* Pages are lazy-loaded via lazyPages – see vite.config manualChunks for vendor splits */
import * as P from "./lazyPages";
import LiveProduction from "../pages/factoryMonitor/LiveProduction";
import MachineStatus from "../pages/factoryMonitor/MachineStatus";
import ProductionLines from "../pages/factoryMonitor/ProductionLines";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/landing" element={<P.Landing />} />
      <Route path="/login" element={<P.Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/gns-admin/login" element={<P.SuperAdminLogin />} />
      <Route path="/gns-admin/verify-otp" element={<P.SuperAdminVerifyOtp />} />
      <Route path="/gns-admin" element={<P.SuperAdminDashboard />} />
      <Route path="/gns-admin/companies/new" element={<P.CreateCompany />} />
      <Route path="/gns-admin/companies/:tenantId" element={<P.CompanyDetail />} />
      <Route path="/forgot-password" element={<P.ForgotPassword />} />
      <Route path="/reset-password" element={<P.ResetPassword />} />
      <Route path="/verify-email" element={<P.VerifyEmail />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <P.Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production"
        element={
          <ProtectedRoute>
            <P.ProductionDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/dashboard"
        element={
          <ProtectedRoute>
            <P.ProductionDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/planning"
        element={
          <ProtectedRoute>
            <P.ProductionPlanning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/work-orders"
        element={
          <ProtectedRoute>
            <P.WorkOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/batches"
        element={
          <ProtectedRoute>
            <P.BatchTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/machines"
        element={
          <ProtectedRoute>
            <P.MachineStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/machines/create"
        element={
          <ProtectedRoute>
            <P.CreateMachine />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/reports"
        element={
          <ProtectedRoute>
            <P.DailyReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/create"
        element={
          <ProtectedRoute>
            <P.CreateProduction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/work-orders/create-quick"
        element={
          <ProtectedRoute>
            <P.QuickCreateWorkOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/production/tasks"
        element={
          <ProtectedRoute>
            <P.MachineAllocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <P.InventoryDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/items"
        element={<Navigate to="/inventory/raw-materials" replace />}
      />
      <Route
        path="/inventory/raw-materials"
        element={
          <ProtectedRoute>
            <P.RawMaterials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/finished-goods"
        element={
          <ProtectedRoute>
            <P.FinishedGoods />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stock-transfer"
        element={
          <ProtectedRoute>
            <P.StockTransfer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stock-adjustment"
        element={
          <ProtectedRoute>
            <P.StockAdjustment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stock-ledger"
        element={
          <ProtectedRoute>
            <P.StockLedger />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/items/create"
        element={
          <ProtectedRoute>
            <P.CreateItem />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/stock-movement"
        element={
          <ProtectedRoute>
            <P.StockMovement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/warehouses"
        element={
          <ProtectedRoute>
            <P.Warehouses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/suppliers"
        element={
          <ProtectedRoute>
            <P.Suppliers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/warehouses/create"
        element={
          <ProtectedRoute>
            <P.CreateWarehouse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory/suppliers/create"
        element={
          <ProtectedRoute>
            <P.CreateSupplier />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr"
        element={
          <ProtectedRoute>
            <P.HRDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/attendance"
        element={
          <ProtectedRoute>
            <P.Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/leave"
        element={
          <ProtectedRoute>
            <P.Leave />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/leave/create"
        element={
          <ProtectedRoute>
            <P.CreateLeave />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/shifts"
        element={
          <ProtectedRoute>
            <P.Shifts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/shifts/create"
        element={
          <ProtectedRoute>
            <P.CreateShift />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/payroll"
        element={
          <ProtectedRoute>
            <P.Payroll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/performance"
        element={
          <ProtectedRoute>
            <P.Performance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/employees"
        element={
          <ProtectedRoute>
            <P.Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/employees/create"
        element={
          <ProtectedRoute>
            <P.CreateEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/payroll/create"
        element={
          <ProtectedRoute>
            <P.CreatePayroll />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/performance/create"
        element={
          <ProtectedRoute>
            <P.CreatePerformance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/dashboard"
        element={
          <ProtectedRoute>
            <P.SalesDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/leads"
        element={
          <ProtectedRoute>
            <P.Leads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/quotations"
        element={
          <ProtectedRoute>
            <P.Quotations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/dispatch"
        element={
          <ProtectedRoute>
            <P.Dispatch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/invoices"
        element={
          <ProtectedRoute>
            <P.InvoiceDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/invoices/copy"
        element={
          <ProtectedRoute>
            <P.InvoiceCopyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/invoices/:id/copy"
        element={
          <ProtectedRoute>
            <P.InvoiceCopyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/invoices/create"
        element={
          <ProtectedRoute>
            <P.TaxInvoiceForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/orders"
        element={
          <ProtectedRoute>
            <P.SalesOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/orders/create"
        element={
          <ProtectedRoute>
            <P.CreateSalesOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/orders/:id"
        element={
          <ProtectedRoute>
            <P.SalesOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/customers"
        element={
          <ProtectedRoute>
            <P.Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/customers/create"
        element={
          <ProtectedRoute>
            <P.CreateCustomer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/payments"
        element={
          <ProtectedRoute>
            <P.PaymentTracking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales/payments/create"
        element={
          <ProtectedRoute>
            <P.CreatePayment />
          </ProtectedRoute>
        }
      />
      <Route path="/accounts" element={<ProtectedRoute><P.AccountsDashboard /></ProtectedRoute>} />
      <Route path="/accounts/profit-loss" element={<ProtectedRoute><P.ProfitLoss /></ProtectedRoute>} />
      <Route path="/accounts/expenses" element={<ProtectedRoute><P.ExpenseTracking /></ProtectedRoute>} />
      <Route path="/accounts/expenses/record" element={<ProtectedRoute><P.RecordExpense /></ProtectedRoute>} />
      <Route path="/accounts/tax-reports" element={<ProtectedRoute><P.TaxReports /></ProtectedRoute>} />
      <Route path="/accounts/income/record" element={<ProtectedRoute><P.RecordIncome /></ProtectedRoute>} />
      <Route path="/procurement/purchase-orders" element={<ProtectedRoute><P.PurchaseOrders /></ProtectedRoute>} />
      <Route path="/procurement/purchase-orders/create" element={<ProtectedRoute><P.CreatePurchaseOrder /></ProtectedRoute>} />
      <Route path="/procurement/vendors" element={<ProtectedRoute><P.VendorManagement /></ProtectedRoute>} />
      <Route path="/procurement/vendors/create" element={<ProtectedRoute><P.CreateVendor /></ProtectedRoute>} />
      <Route path="/procurement/material-requests" element={<ProtectedRoute><P.MaterialRequests /></ProtectedRoute>} />
      <Route path="/procurement/material-requests/create" element={<ProtectedRoute><P.CreateMaterialRequest /></ProtectedRoute>} />
      <Route path="/procurement/goods-receipt" element={<ProtectedRoute><P.GoodsReceipt /></ProtectedRoute>} />
      <Route path="/procurement/goods-receipt/create" element={<ProtectedRoute><P.CreateGoodsReceipt /></ProtectedRoute>} />
      <Route path="/procurement/supplier-payments" element={<ProtectedRoute><P.SupplierPayments /></ProtectedRoute>} />
      <Route path="/procurement/supplier-payments/create" element={<ProtectedRoute><P.CreateSupplierPayment /></ProtectedRoute>} />
      <Route path="/procurement/supply-chain" element={<ProtectedRoute><P.SupplyChainDashboard /></ProtectedRoute>} />
      <Route path="/quality" element={<ProtectedRoute><P.QualityDashboard /></ProtectedRoute>} />
      <Route path="/quality/incoming" element={<ProtectedRoute><P.IncomingInspection /></ProtectedRoute>} />
      <Route path="/quality/in-process" element={<ProtectedRoute><P.InProcessQC /></ProtectedRoute>} />
      <Route path="/quality/final" element={<ProtectedRoute><P.FinalQC /></ProtectedRoute>} />
      <Route path="/quality/inspection" element={<ProtectedRoute><P.QualityInspection /></ProtectedRoute>} />
      <Route path="/quality/defects" element={<ProtectedRoute><P.DefectTracking /></ProtectedRoute>} />
      <Route path="/quality/batch-reports" element={<ProtectedRoute><P.BatchQualityReports /></ProtectedRoute>} />
      <Route path="/quality/compliance" element={<ProtectedRoute><P.ComplianceLogs /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><P.MaintenanceDashboard /></ProtectedRoute>} />
      <Route path="/maintenance/machines" element={<ProtectedRoute><P.MachineMaintenance /></ProtectedRoute>} />
      <Route path="/maintenance/preventive" element={<ProtectedRoute><P.PreventiveMaintenance /></ProtectedRoute>} />
      <Route path="/maintenance/breakdowns" element={<ProtectedRoute><P.BreakdownReports /></ProtectedRoute>} />
      <Route path="/maintenance/machine-history" element={<ProtectedRoute><P.MachineHistory /></ProtectedRoute>} />
      <Route path="/maintenance/schedule" element={<ProtectedRoute><P.MaintenanceSchedule /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><P.ExecutiveDashboard /></ProtectedRoute>} />
      <Route path="/analytics/executive" element={<ProtectedRoute><P.ExecutiveDashboard /></ProtectedRoute>} />
      <Route path="/analytics/live" element={<ProtectedRoute><P.LiveDashboard /></ProtectedRoute>} />
      <Route path="/analytics/production" element={<ProtectedRoute><P.ProductionAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/machine-efficiency" element={<ProtectedRoute><P.MachineEfficiency /></ProtectedRoute>} />
      <Route path="/analytics/inventory" element={<ProtectedRoute><P.InventoryAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/sales" element={<ProtectedRoute><P.SalesAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/finance" element={<ProtectedRoute><P.FinanceAnalytics /></ProtectedRoute>} />
      <Route path="/analytics/profit" element={<ProtectedRoute><P.ProfitAnalysis /></ProtectedRoute>} />
      <Route path="/analytics/forecasting" element={<ProtectedRoute><P.ForecastingDashboard /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><P.AllAlerts /></ProtectedRoute>} />
      <Route path="/alerts/low-stock" element={<ProtectedRoute><P.LowStockAlerts /></ProtectedRoute>} />
      <Route path="/alerts/machine-failure" element={<ProtectedRoute><P.MachineFailureAlerts /></ProtectedRoute>} />
      <Route path="/alerts/production-delay" element={<ProtectedRoute><P.ProductionDelayAlerts /></ProtectedRoute>} />
      <Route path="/alerts/maintenance" element={<ProtectedRoute><P.MaintenanceReminders /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><P.UserManagement /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute><P.RolesPermissions /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute><P.RolesPermissions /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute><P.AccessLogs /></ProtectedRoute>} />
      <Route path="/admin/access-logs" element={<Navigate to="/admin/audit-logs" replace />} />
      <Route path="/admin/integrations" element={<ProtectedRoute><P.IntegrationsDashboard /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><P.DocumentsDashboard /></ProtectedRoute>} />
      <Route path="/documents/purchase" element={<ProtectedRoute><P.PurchaseDocuments /></ProtectedRoute>} />
      <Route path="/documents/production" element={<ProtectedRoute><P.ProductionFiles /></ProtectedRoute>} />
      <Route path="/documents/quality" element={<ProtectedRoute><P.QualityCertificates /></ProtectedRoute>} />
      <Route path="/documents/reports" element={<ProtectedRoute><P.ReportsArchive /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><P.SettingsLayout /></ProtectedRoute>}>
        <Route index element={<P.SettingsHome />} />
        <Route path=":sectionId" element={<P.SettingsSectionPage />} />
        {/* Legacy deep links → section pages (must not target the same path or it loops) */}
        <Route path="addresses/billing" element={<Navigate to="/settings/company" replace />} />
        <Route path="addresses/delivery" element={<Navigate to="/settings/inventory" replace />} />
        <Route path="accounts/*" element={<Navigate to="/settings/finance" replace />} />
        <Route path="documents/:legacySub/*" element={<Navigate to="/settings/documents" replace />} />
        <Route path="documents/:legacySub" element={<Navigate to="/settings/documents" replace />} />
      </Route>
      <Route path="/masters/products" element={<ProtectedRoute><P.ProductsMaster /></ProtectedRoute>} />
      <Route path="/masters/bom" element={<ProtectedRoute><P.BomMaster /></ProtectedRoute>} />
      <Route path="/masters/departments" element={<ProtectedRoute><P.DepartmentManagement /></ProtectedRoute>} />
      <Route path="/production/schedule" element={<ProtectedRoute><P.ProductionSchedule /></ProtectedRoute>} />
      <Route path="/procurement/rfq" element={<ProtectedRoute><P.RFQ /></ProtectedRoute>} />
      <Route path="/finance/accounts-payable" element={<ProtectedRoute><P.AccountsPayable /></ProtectedRoute>} />
      <Route path="/finance/accounts-receivable" element={<ProtectedRoute><P.AccountsReceivable /></ProtectedRoute>} />
      <Route path="/finance/payment-tracking" element={<ProtectedRoute><P.PaymentTracking /></ProtectedRoute>} />
      <Route path="/finance/general-ledger" element={<ProtectedRoute><P.GeneralLedger /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute><Navigate to="/accounts" replace /></ProtectedRoute>} />
      <Route path="/factory-monitor/live-production" element={<ProtectedRoute><LiveProduction /></ProtectedRoute>} />
      <Route path="/factory-monitor/machine-status" element={<ProtectedRoute><MachineStatus /></ProtectedRoute>} />
      <Route path="/factory-monitor/production-lines" element={<ProtectedRoute><ProductionLines /></ProtectedRoute>} />
      <Route path="/iot" element={<ProtectedRoute><P.IotDashboard /></ProtectedRoute>} />
      <Route path="/iot/wearables" element={<ProtectedRoute><P.Wearables /></ProtectedRoute>} />
      <Route path="/iot/machine-analytics" element={<ProtectedRoute><P.MachineAnalytics /></ProtectedRoute>} />
      <Route path="/iot/sensors" element={<ProtectedRoute><P.Sensors /></ProtectedRoute>} />
      <Route path="/iot/cobots" element={<ProtectedRoute><P.Cobots /></ProtectedRoute>} />
      <Route path="/iot/agvs" element={<ProtectedRoute><P.Agvs /></ProtectedRoute>} />
      <Route path="/iot/drones" element={<ProtectedRoute><P.Drones /></ProtectedRoute>} />
      <Route path="/iot/smart-packaging" element={<ProtectedRoute><P.SmartPackaging /></ProtectedRoute>} />
      <Route path="/iot/live-operations" element={<ProtectedRoute><P.LiveOperations /></ProtectedRoute>} />
      <Route path="*" element={<P.NotFound />} />
    </Routes>
  );
}

