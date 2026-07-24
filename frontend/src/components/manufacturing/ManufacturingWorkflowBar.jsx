import { Link } from "react-router-dom";
import { Check, Circle } from "lucide-react";

import { buildWorkflowProgress } from "../../config/manufacturingWorkflow";

/**
 * Manufacturing spine progress: Previous → Current → Next
 * ✔ completed · 🟡 in progress · ⚪ pending
 */
export default function ManufacturingWorkflowBar({
  currentStepId,
  className = "",
  compact = false,
}) {
  const steps = buildWorkflowProgress(currentStepId);
  const currentIdx = steps.findIndex((s) => s.state === "current");
  const prev = currentIdx > 0 ? steps[currentIdx - 1] : null;
  const curr = steps[currentIdx] || steps[0];
  const next = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Manufacturing workflow
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {prev && (
            <>
              <Link
                to={prev.path}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <span aria-hidden>✔</span>
                <span className="text-slate-500 dark:text-slate-400">Prev:</span>
                {prev.label}
              </Link>
              <span className="text-slate-300 dark:text-slate-600">↓</span>
            </>
          )}
          {curr && (
            <>
              <Link
                to={curr.path}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <span aria-hidden>🟡</span>
                <span className="text-slate-500 dark:text-slate-400">Current:</span>
                {curr.label}
              </Link>
              {next && <span className="text-slate-300 dark:text-slate-600">↓</span>}
            </>
          )}
          {next && (
            <Link
              to={next.path}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
            >
              <span aria-hidden>⚪</span>
              <span className="text-slate-400">Next:</span>
              {next.label}
            </Link>
          )}
        </div>
      </div>

      {!compact && (
        <div className="flex gap-1 overflow-x-auto px-3 py-3 scrollbar-thin">
          {steps.map((step) => {
            const isDone = step.state === "completed";
            const isCurrent = step.state === "current";
            return (
              <Link
                key={step.id}
                to={step.path}
                title={step.label}
                className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 text-center transition ${
                  isCurrent
                    ? "bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-950/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-amber-400 text-amber-950"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5 fill-current" />}
                </span>
                <span
                  className={`max-w-[4.5rem] truncate text-[10px] font-medium leading-tight ${
                    isCurrent
                      ? "text-amber-900 dark:text-amber-200"
                      : isDone
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
