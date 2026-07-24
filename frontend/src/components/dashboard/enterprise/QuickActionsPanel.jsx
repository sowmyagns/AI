import { Link } from "react-router-dom";

import { quickActions } from "../../../data/dashboardDummyData";
import useAuth from "../../../hooks/useAuth";
import { isOperator } from "../../../config/permissions";
import DashboardIcon from "./DashboardIcons";

export default function QuickActionsPanel() {
  const { user } = useAuth();
  if (isOperator(user)) return null;
  return (
    <section className="rounded-2xl border border-slate-100/80 bg-white/90 p-5 shadow-[0_4px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-6">
      <h3 className="mb-4 text-base font-bold text-[#0F172A]">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg"
            style={{ ["--action-color"]: action.color }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: action.color }}
            >
              <DashboardIcon name={action.icon} />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-slate-700 group-hover:text-[#0F172A]">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
