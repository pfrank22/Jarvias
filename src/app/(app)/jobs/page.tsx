import Link from "next/link";
import { TrackBadge } from "@/components/job-ui";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { STAGE_LABEL, isActive, nextStep } from "@/server/job-policy";
import { listJobs } from "@/server/jobs";
import { getTenantContext } from "@/server/session";

export const metadata = { title: "Jobs" };

export default async function JobsPage() {
  const ctx = await getTenantContext();
  const jobs = await listJobs(ctx);
  const active = jobs.filter((j) => isActive(j.stage));
  const closed = jobs.filter((j) => !isActive(j.stage));

  return (
    <>
      <PageHeader title="Jobs" subtitle={`${active.length} active · ${closed.length} closed`} />
      {jobs.length === 0 ? (
        <EmptyState>No jobs yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {[...active, ...closed].map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`} className="block">
                <Card className={isActive(job.stage) ? "" : "opacity-60"}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        {job.number ?? "No Buildertrend job yet"}
                      </p>
                      <p className="truncate font-semibold">{job.homeownerName}</p>
                      <p className="truncate text-xs text-slate-500">{job.address}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <TrackBadge track={job.track} />
                      <span className="text-xs text-slate-500">{STAGE_LABEL[job.stage]}</span>
                    </div>
                  </div>
                  {nextStep(job) ? (
                    <p className="mt-2 text-sm text-slate-700">Next: {nextStep(job)}</p>
                  ) : null}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
