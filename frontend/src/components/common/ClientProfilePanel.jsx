import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, UserRound } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import BrandLogo from "../common/BrandLogo";

function formatRoleLabel(role) {
  if (!role || typeof role !== "string") return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ClientProfilePanel({ onClose }) {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser?.();
  }, [refreshUser]);

  if (!user) return null;

  const displayName = user.full_name || user.name || "User";
  const displayRole = formatRoleLabel(user.role_name || user.role);

  const go = (path) => {
    onClose?.();
    navigate(path);
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
        <BrandLogo size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {displayName}
          </p>
          {displayRole ? (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{displayRole}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => go("/settings/my-account")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
        >
          <UserRound className="h-4 w-4 text-teal-600" />
          My Account
        </button>
        <button
          type="button"
          onClick={() => go("/settings")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
        >
          <Settings className="h-4 w-4 text-slate-500" />
          Settings
        </button>
        <button
          type="button"
          onClick={async () => {
            onClose?.();
            await logout();
            navigate("/login");
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700">
        Company and subscription details are available under{" "}
        <Link
          to="/settings/my-account"
          onClick={onClose}
          className="font-semibold text-teal-600 hover:underline dark:text-teal-400"
        >
          Settings → My Account
        </Link>
        .
      </p>
    </div>
  );
}
