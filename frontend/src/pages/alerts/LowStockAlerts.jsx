import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";

import AlertsDashboard from "./AlertsDashboard";

export default function LowStockAlerts() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-6 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {t("alerts.lowStockSyncTitle", {
                defaultValue: "Automatic low stock notifications",
              })}
            </p>
            <p className="mt-1 text-amber-800 dark:text-amber-300/90">
              {t("alerts.lowStockSyncDescription", {
                defaultValue:
                  "Alerts are generated when item stock falls below the reorder level. They also appear in the notification bell.",
              })}
            </p>
            <Link
              to="/inventory/raw-materials"
              className="mt-2 inline-block font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              {t("alerts.viewInventory", { defaultValue: "View inventory" })}
            </Link>
          </div>
        </div>
      </div>
      <AlertsDashboard
        title="Low Stock Alerts"
        subtitle="Items at or below their reorder level."
        initialAlertType="low_stock"
      />
    </div>
  );
}
