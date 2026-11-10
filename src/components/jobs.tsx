"use client";

import { useActionState } from "react";
import type { ActionChannel, ActionStatus } from "@/generated/prisma/enums";
import {
  jobCommandAction,
  resolveDecisionAction,
  transitionActionAction,
  type FormState,
} from "@/app/(app)/jobs/actions";

const DONE_BY_ME: Record<ActionChannel, string> = {
  EMAIL: "I sent it",
  TEXT: "I sent it",
  HOMEOWNER_UPDATE: "I sent it",
  CALL: "I made the call",
  TRELLO: "I created it",
  BUILDERTREND: "I created it",
  TASK: "Done",
};

const BUTTON_LABEL = (channel: ActionChannel, from: ActionStatus, to: ActionStatus): string => {
  if (to === "SENT")
    return from === "PENDING_APPROVAL" ? `Approve · ${DONE_BY_ME[channel]}` : DONE_BY_ME[channel];
  const labels: Record<ActionStatus, string> = {
    DRAFT: "Back to draft",
    PENDING_APPROVAL: "Send for approval",
    SENT: "I sent it",
    COMPLETED: "Mark done",
    CANCELLED: "Cancel",
    FAILED: "Mark failed",
  };
  return labels[to];
};

/** Buttons for the allowed next states. "Sent" is the manager's confirmation — Jarvis sends nothing. */
export function ActionButtons({
  actionId,
  channel,
  status,
  allowed,
}: {
  actionId: string;
  channel: ActionChannel;
  status: ActionStatus;
  allowed: ActionStatus[];
}) {
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    transitionActionAction,
    null,
  );
  if (allowed.length === 0) return null;
  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="actionId" value={actionId} />
      <div className="flex flex-wrap gap-2">
        {allowed.map((to) => (
          <button
            key={to}
            type="submit"
            name="to"
            value={to}
            disabled={pending}
            className={`min-h-11 rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${
              to === "SENT" || to === "COMPLETED"
                ? "bg-brand-600 text-white active:bg-brand-700"
                : "border border-slate-300 bg-white text-slate-700 active:bg-slate-50"
            }`}
          >
            {BUTTON_LABEL(channel, status, to)}
          </button>
        ))}
      </div>
      {state && !state.ok ? (
        <p data-testid="form-error" role="alert" className="mt-2 text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function ResolveDecisionForm({ decisionId }: { decisionId: string }) {
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    resolveDecisionAction,
    null,
  );
  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="decisionId" value={decisionId} />
      <label className="sr-only" htmlFor={`res-${decisionId}`}>
        What did you decide?
      </label>
      <input
        id={`res-${decisionId}`}
        name="resolution"
        maxLength={1000}
        placeholder="What did you decide? (optional)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="submit"
          name="outcome"
          value="DISMISSED"
          disabled={pending}
          className="min-h-11 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          type="submit"
          name="outcome"
          value="RESOLVED"
          disabled={pending}
          className="min-h-11 rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          Decided
        </button>
      </div>
      {state && !state.ok ? (
        <p data-testid="form-error" role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** A small form that runs one job command. Extra inputs go in `children`. */
export function CommandForm({
  jobId,
  cmd,
  label,
  primary = false,
  hidden = {},
  children,
  className = "",
}: {
  jobId: string;
  cmd: string;
  label: string;
  primary?: boolean;
  hidden?: Record<string, string>;
  children?: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState | null, FormData>(
    jobCommandAction,
    null,
  );
  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="cmd" value={cmd} />
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <button
        type="submit"
        disabled={pending}
        className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold disabled:opacity-50 ${
          primary
            ? "bg-brand-600 text-white active:bg-brand-700"
            : "border border-slate-300 bg-white text-slate-700 active:bg-slate-50"
        }`}
      >
        {pending ? "Saving…" : label}
      </button>
      {state && !state.ok ? (
        <p data-testid="form-error" role="alert" className="mt-1 text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
