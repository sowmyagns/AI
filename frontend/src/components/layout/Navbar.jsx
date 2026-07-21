import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  ChevronDown,
  Maximize2,
  Menu,
  Minimize2,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import GlobalSearch from "../common/GlobalSearch";
import ClientProfilePanel from "../common/ClientProfilePanel";
import NotificationBell from "../notifications/NotificationBell";

function getPageMeta(pathname, t) {
  if (pathname === "/") {
    return { title: t("nav.dashboard") };
  }
  const segment = pathname.split("/").filter(Boolean)[0] || "dashboard";
  const title = segment.charAt(0).toUpperCase() + segment.replace(/-/g, " ").slice(1);
  return { title };
}

export default function Navbar({ onMenuClick }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const profileRef = useRef(null);

  const page = getPageMeta(location.pathname, t);
  const displayName = user?.full_name || user?.name || "User";
  const firstName = String(displayName).trim().split(/\s+/)[0] || "User";
  const welcomeLabel = `Welcome, ${firstName}`;
  const displayRole = user?.role_name || user?.role || "";

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!showProfile) return undefined;
    const onPointerDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showProfile]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block fullscreen without a direct user gesture.
    }
  };

  const dateLabel = now.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 lg:px-6 lg:py-3.5">
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:max-w-[340px]">
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1E293B]">{page.title}</h1>
            <p className="mt-0.5 text-xs font-medium text-teal-700 sm:text-sm">
              {welcomeLabel}
            </p>
          </div>
        </div>

        <div className="order-3 w-full lg:order-none lg:flex-1 lg:max-w-xl">
          <GlobalSearch />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NotificationBell />

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 sm:flex"
            title={isFullscreen ? t("common.exitFullscreen", { defaultValue: "Exit fullscreen" }) : t("common.fullscreen")}
            aria-label={isFullscreen ? t("common.exitFullscreen", { defaultValue: "Exit fullscreen" }) : t("common.fullscreen")}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
            <Calendar className="h-4 w-4 text-[#2563EB]" />
            <div className="text-right">
              <p className="text-[10px] font-medium text-slate-500 leading-tight">{dateLabel}</p>
              <p className="text-sm font-bold tabular-nums text-[#1E293B]">{timeLabel}</p>
            </div>
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 hover:bg-slate-50 sm:px-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-xs font-bold text-white">
                {displayName[0].toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500">{displayRole}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>
            {showProfile && (
              <ClientProfilePanel onClose={() => setShowProfile(false)} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
