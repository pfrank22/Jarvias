import { BottomNav } from "@/components/BottomNav";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { Badge } from "@/components/ui";
import { humanize } from "@/lib/format";
import { countPendingApprovals } from "@/server/approvals";
import { getTenantContext, listMyCompanies } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  const [companies, pendingCount] = await Promise.all([
    listMyCompanies(),
    countPendingApprovals(ctx),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              J
            </span>
            <CompanySwitcher companies={companies} activeId={ctx.companyId} />
          </div>
          <div className="flex items-center gap-2 text-right">
            <Badge>{humanize(ctx.role)}</Badge>
            <span className="hidden text-sm text-slate-600 sm:inline">{ctx.userName}</span>
          </div>
        </div>
        <div className="mx-auto hidden max-w-3xl px-2 pb-2 md:block">
          <BottomNav pendingCount={pendingCount} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-10">{children}</main>
      <div className="md:hidden">
        <BottomNav pendingCount={pendingCount} />
      </div>
    </div>
  );
}
