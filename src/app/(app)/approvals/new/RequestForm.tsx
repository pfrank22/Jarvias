"use client";

import { useActionState } from "react";
import { createRequestAction, type RequestState } from "./actions";

const types = [
  ["PURCHASE", "Purchase"],
  ["CHANGE_ORDER", "Change order"],
  ["INVOICE", "Invoice"],
  ["TIMESHEET", "Timesheet"],
  ["DOCUMENT", "Document"],
] as const;
const priorities = [
  ["LOW", "Low"],
  ["NORMAL", "Normal"],
  ["HIGH", "High"],
  ["URGENT", "Urgent"],
] as const;

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
const label = "mb-1 block text-sm font-medium text-slate-700";

interface Props {
  projects: { id: string; code: string; name: string }[];
  defaultProjectId?: string;
}

export function RequestForm({ projects, defaultProjectId }: Props) {
  const [state, formAction, pending] = useActionState<RequestState | null, FormData>(
    createRequestAction,
    null,
  );

  const v = state?.values ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className={label}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={120}
          defaultValue={v.title}
          className={input}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="type" className={label}>
            Type
          </label>
          <select id="type" name="type" defaultValue={v.type ?? "PURCHASE"} className={input}>
            {types.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="priority" className={label}>
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue={v.priority ?? "NORMAL"}
            className={input}
          >
            {priorities.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="projectId" className={label}>
          Project <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <select
          id="projectId"
          name="projectId"
          defaultValue={v.projectId ?? defaultProjectId ?? ""}
          className={input}
        >
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className={label}>
            Amount (USD) <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="0.00"
            maxLength={32}
            defaultValue={v.amount}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="dueDate" className={label}>
            Needed by <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={v.dueDate}
            className={input}
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className={label}>
          Details <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={v.description}
          className={input}
        />
      </div>

      {state?.message ? (
        <p role="alert" data-testid="form-error" className="text-sm text-red-600">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white active:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}
