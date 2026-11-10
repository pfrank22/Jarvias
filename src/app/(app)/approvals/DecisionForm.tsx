"use client";

import { useActionState } from "react";
import { decideAction, type DecisionState } from "./actions";

export function DecisionForm({ approvalId }: { approvalId: string }) {
  const [state, formAction, pending] = useActionState<DecisionState | null, FormData>(
    decideAction,
    null,
  );

  return (
    <form action={formAction} className="mt-3 space-y-2">
      <input type="hidden" name="approvalId" value={approvalId} />
      <label className="sr-only" htmlFor={`note-${approvalId}`}>
        Note
      </label>
      <textarea
        id={`note-${approvalId}`}
        name="note"
        rows={2}
        maxLength={1000}
        placeholder="Add a note (required to reject)"
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="submit"
          name="decision"
          value="REJECT"
          disabled={pending}
          className="rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-50 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="submit"
          name="decision"
          value="APPROVE"
          disabled={pending}
          className="rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white active:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Approve"}
        </button>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
