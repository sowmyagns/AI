import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import BrandLogo from "../common/BrandLogo";
import useAuth from "../../hooks/useAuth";
import { getSidebarMenus } from "../../api/authApi";
import { userCanAccess } from "../../config/permissions";
import { SIDEBAR_NAV, sectionHasActiveChild } from "../../config/sidebarNav";

const ICON_BY_KEY = {
  dashboard: LayoutDashboard,
  masters: Layers,
  production: Factory,
  inventory: Boxes,
  procurement: ShoppingCart,
  sales: Wallet,
  hr: Users,
  finance: Landmark,
  quality: CheckCircle2,
  maintenance: Wrench,
  alerts: Bell,
  documents: FolderOpen,
  analytics: BarChart3,
  settings: Settings,
  admin: Settings,
};

function FactorySkyline() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-14 opacity-40" aria-hidden>
      <rect x="10" y="30" width="25" height="25" fill="#3B82F6" opacity="0.5" />
      <rect x="40" y="20" width="20" height="35" fill="#60A5FA" opacity="0.6" />
      <rect x="65" y="25" width="30" height="30" fill="#2563EB" opacity="0.5" />
      <rect x="100" y="15" width="18" height="40" fill="#3B82F6" opacity="0.55" />
      <rect x="125" y="28" width="25" height="27" fill="#60A5FA" opacity="0.5" />
      <rect x="155" y="22" width="22" height="33" fill="#2563EB" opacity="0.45" />
      <polygon points="40,20 50,8 60,20" fill="#93C5FD" opacity="0.6" />
      <polygon points="100,15 109,5 118,15" fill="#93C5FD" opacity="0.6" />
    </svg>
  );
}

function mapApiMenusToNav(menus) {
  return (menus || []).map((section) => {
    const Icon = ICON_BY_KEY[section.key] || LayoutDashboard;
    if (section.path && !(section.children && section.children.length)) {
      return {
        key: section.key,
        label: section.label,
        to: section.path,
        icon: Icon,
        module: section.module,
        end: section.path === "/",
      };
    }
    return {
      key: section.key,
      label: section.label,
      icon: Icon,
      module: section.module,
      children: (section.children || []).map((c) => ({
        label: c.label,
        to: c.path,
        module: c.module,
      })),
    };
  });
}

function filterStaticNav(user) {
  return SIDEBAR_NAV.map((section) => {
    if (section.to) {
      return userCanAccess(user, section.module) ? section : null;
    }
    const children = (section.children || []).filter((c) => userCanAccess(user, c.module));
    if (children.length === 0) return null;
    return { ...section, children };
  }).filter(Boolean);
}

function buildInitialExpanded(pathname, nav) {
  const state = {};
  nav.forEach((section) => {
    if (section.children && sectionHasActiveChild(pathname, section)) {
      state[section.key] = true;
    }
  });
  return state;
}

export default function Sidebar({ collapsed, onClose }) {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [apiNav, setApiNav] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setApiNav(null);
      return;
    }
    let cancelled = false;
    getSidebarMenus()
      .then((menus) => {
        if (!cancelled) setApiNav(mapApiMenusToNav(menus));
      })
      .catch(() => {
        if (!cancelled) setApiNav(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.role, user?.role_id]);

  const visibleNav = useMemo(() => {
    if (apiNav && apiNav.length) return apiNav;
    return filterStaticNav(user);
  }, [apiNav, user]);

  const [expanded, setExpanded] = useState(() =>
    buildInitialExpanded(location.pathname, visibleNav)
  );

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      visibleNav.forEach((section) => {
        if (section.children && sectionHasActiveChild(location.pathname, section)) {
          next[section.key] = true;
        }
      });
      return next;
    });
  }, [location.pathname, visibleNav]);

  const toggleSection = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const topLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all ${
      isActive
        ? "bg-[#2563EB] text-white font-medium shadow-md shadow-blue-900/30"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const childLinkClass = ({ isActive }) =>
    `block rounded-lg py-2 pl-9 pr-3 text-[13px] transition-colors ${
      isActive
        ? "bg-[#2563EB]/90 text-white font-medium"
        : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
    }`;

  const sectionButtonClass = (_isOpen, hasActive) =>
    `flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      hasActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const sectionLabel = (section) => section.label || (section.labelKey ? t(section.labelKey) : section.key);
  const childLabel = (child) => child.label || (child.labelKey ? t(child.labelKey) : child.to);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[#001B3D] text-white">
      <div className={`shrink-0 border-b border-white/10 ${collapsed ? "p-3" : "px-4 py-5"}`}>
        <Link to="/" className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`} onClick={() => onClose?.()}>
          <BrandLogo size="md" imageClassName="rounded-lg bg-white/95 p-0.5" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-lg font-bold tracking-tight">GNS Insights</p>
              <p className="text-[9px] leading-tight text-slate-400">{t("nav.tagline")}</p>
            </div>
          )}
        </Link>
      </div>

      <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visibleNav.map((section) => {
          if (section.to) {
            const Icon = section.icon || LayoutDashboard;
            const label = sectionLabel(section);
            return (
              <NavLink
                key={section.key}
                to={section.to}
                end={section.end}
                onClick={() => onClose?.()}
                title={collapsed ? label : undefined}
                className={topLinkClass}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            );
          }

          const Icon = section.icon || LayoutDashboard;
          const isOpen = expanded[section.key];
          const hasActive = sectionHasActiveChild(location.pathname, section);
          const label = sectionLabel(section);

          return (
            <div key={section.key} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={sectionButtonClass(isOpen, hasActive)}
                aria-expanded={isOpen}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  {!collapsed && <span className="truncate text-left">{label}</span>}
                </span>
                {!collapsed && (
                  isOpen ? <ChevronDown className="h-4 w-4 shrink-0 opacity-70" /> : <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                )}
              </button>
              {!collapsed && isOpen && (
                <div className="space-y-0.5 pb-1">
                  {section.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end={child.end}
                      onClick={() => onClose?.()}
                      className={childLinkClass}
                    >
                      {childLabel(child)}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="shrink-0 border-t border-white/10 px-3 py-4 space-y-4">
          <FactorySkyline />
          <p className="text-center text-[9px] font-medium uppercase tracking-wider text-slate-500">
            {t("nav.footerTagline")}
          </p>
        </div>
      )}
    </aside>
  );
}
