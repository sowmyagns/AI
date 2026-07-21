import { Suspense, useState } from "react";
import { useLocation } from "react-router-dom";

import AppRoutes from "./routes/AppRoutes";
import RouteFallback from "./components/common/RouteFallback";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Breadcrumbs from "./components/common/Breadcrumbs";

/** Routes that render without the ERP shell (sidebar + navbar). */
function isShellLessRoute(pathname) {
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/landing" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email"
  ) {
    return true;
  }
  if (pathname.startsWith("/gns-admin")) return true;
  if (pathname.startsWith("/settings")) return true;
  return false;
}

export default function App() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isShellLessRoute(location.pathname)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Suspense fallback={<RouteFallback />}>
          <AppRoutes />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#F4F7FE]">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] -translate-y-[200%] rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg outline-none ring-2 ring-teal-500 ring-offset-2 transition-transform focus:translate-y-0 dark:ring-offset-slate-900"
      >
        Skip to main content
      </a>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 w-60 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>
      <div className="flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-[#F4F7FE] p-4 sm:p-5 lg:p-6 pb-8 outline-none">
          <div className="ui-page ui-stack">
            <Breadcrumbs />
            <Suspense fallback={<RouteFallback />}>
              <AppRoutes />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
