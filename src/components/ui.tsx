import type { ReactNode } from "react";
import { humanize } from "@/lib/format";

type Tone = "slate" | "green" | "amber" | "red" | "blue";

const toneClasses: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-100",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const healthTone: Record<string, Tone> = { ON_TRACK: "green", AT_RISK: "amber", OFF_TRACK: "red" };
export function HealthBadge({ health }: { health: string }) {
  return <Badge tone={healthTone[health] ?? "slate"}>{humanize(health)}</Badge>;
}

const priorityTone: Record<string, Tone> = {
  LOW: "slate",
  NORMAL: "blue",
  HIGH: "amber",
  URGENT: "red",
};
export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={priorityTone[priority] ?? "slate"}>{humanize(priority)}</Badge>;
}

const statusTone: Record<string, Tone> = {
  PLANNING: "slate",
  ACTIVE: "blue",
  ON_HOLD: "amber",
  COMPLETED: "green",
  CANCELLED: "slate",
  TODO: "slate",
  IN_PROGRESS: "blue",
  BLOCKED: "red",
  DONE: "green",
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};
export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "slate"}>{humanize(status)}</Badge>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
      {action}
    </div>
  );
}

export function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "red" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full ${tone === "red" ? "bg-red-500" : "bg-brand-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
