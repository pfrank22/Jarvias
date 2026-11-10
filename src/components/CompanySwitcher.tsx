"use client";

import { useRef } from "react";
import { switchCompany } from "@/app/actions/company";

interface Props {
  companies: { id: string; name: string }[];
  activeId: string;
}

export function CompanySwitcher({ companies, activeId }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  if (companies.length < 2) {
    return <span className="text-sm font-semibold">{companies[0]?.name}</span>;
  }
  return (
    <form ref={formRef} action={switchCompany}>
      <label htmlFor="company-switcher" className="sr-only">
        Active company
      </label>
      <select
        id="company-switcher"
        name="companyId"
        defaultValue={activeId}
        onChange={() => formRef.current?.requestSubmit()}
        className="max-w-[60vw] truncate rounded-lg border-0 bg-slate-100 py-1.5 pl-2 pr-8 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ml-2 text-sm text-brand-600">
          Switch
        </button>
      </noscript>
    </form>
  );
}
