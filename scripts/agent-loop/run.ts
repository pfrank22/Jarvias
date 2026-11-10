/**
 * Agent-loop orchestrator. Runs inside GitHub Actions (.github/workflows/agent-loop.yml).
 *
 * Reads the PR's CI and Codex review state, decides the next step with
 * `decide()`, and then does exactly one of:
 *   - nothing (wait / stopped)
 *   - label the PR ready for a human
 *   - escalate to a human (retry limit reached)
 *   - post consolidated feedback and dispatch the Claude fix workflow
 *
 * It NEVER merges, approves, deploys or pushes code.
 *
 * Usage: node scripts/agent-loop/run.ts   (Node >= 22.18, built-in type stripping)
 * Env:   GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER or HEAD_SHA,
 *        MAX_ITERATIONS (default 3), REQUIRED_CHECKS (default "ci"),
 *        TRUSTED_BOTS (default "github-actions[bot]"), DRY_RUN=true to only log.
 */
import {
  ciStateFrom,
  codexVerdictFor,
  decide,
  iterationMarker,
  iterationsFrom,
  type CommentLike,
} from "./decide.ts";

const LABELS = {
  optIn: "agent-loop",
  ready: "agent-ready-for-review",
  needsHuman: "agent-needs-human",
  stop: "agent-stop",
} as const;

const token = required("GITHUB_TOKEN");
const repo = required("GITHUB_REPOSITORY");
const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
const maxIterations = Number(process.env.MAX_ITERATIONS ?? "3");
const requiredChecks = (process.env.REQUIRED_CHECKS ?? "ci")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const trusted = (process.env.TRUSTED_BOTS ?? "github-actions[bot]").split(",").map((s) => s.trim());
const dryRun = process.env.DRY_RUN === "true";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${api}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    // Never echo request headers (they contain the token).
    throw new Error(
      `GitHub API ${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`,
    );
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

async function act(description: string, fn: () => Promise<unknown>) {
  console.log(`${dryRun ? "[dry-run] " : ""}${description}`);
  if (!dryRun) await fn();
}

interface Pr {
  number: number;
  state: string;
  draft: boolean;
  head: { sha: string; ref: string; repo: { full_name: string } | null };
  base: { ref: string; repo: { default_branch: string } };
  labels: { name: string }[];
}

async function findPr(): Promise<Pr | null> {
  if (process.env.PR_NUMBER) return gh<Pr>(`/repos/${repo}/pulls/${process.env.PR_NUMBER}`);
  const sha = process.env.HEAD_SHA;
  if (!sha) throw new Error("PR_NUMBER or HEAD_SHA is required");
  const prs = await gh<Pr[]>(`/repos/${repo}/commits/${sha}/pulls`);
  return prs.find((p) => p.state === "open" && p.head.sha === sha) ?? null;
}

async function listComments(prNumber: number): Promise<CommentLike[]> {
  const out: CommentLike[] = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh<{ body: string; user: { login: string } | null }[]>(
      `/repos/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
    );
    out.push(...batch.map((c) => ({ body: c.body, author: c.user?.login ?? null })));
    if (batch.length < 100) break;
  }
  return out;
}

async function failingCheckSummary(sha: string): Promise<string> {
  const { check_runs } = await gh<{
    check_runs: { name: string; conclusion: string | null; html_url: string }[];
  }>(`/repos/${repo}/commits/${sha}/check-runs?per_page=100`);
  const failing = check_runs.filter(
    (r) =>
      requiredChecks.includes(r.name) &&
      !["success", "skipped", "neutral", null].includes(r.conclusion),
  );
  return failing
    .map((r) => `- \`${r.name}\`: **${r.conclusion}** — [logs](${r.html_url})`)
    .join("\n");
}

async function main() {
  const pr = await findPr();
  if (!pr) return console.log("No open PR for this commit; nothing to do.");
  const labels = pr.labels.map((l) => l.name);

  if (pr.state !== "open" || pr.draft)
    return console.log(`PR #${pr.number} is not open/ready; skipping.`);
  if (!labels.includes(LABELS.optIn))
    return console.log(`PR #${pr.number} lacks the ${LABELS.optIn} label; skipping.`);
  if (pr.head.repo?.full_name !== repo)
    return console.log("PR is from a fork; the agent loop never runs on forks.");
  if (
    pr.base.ref !== pr.base.repo.default_branch &&
    process.env.ALLOW_NON_DEFAULT_BASE !== "true"
  ) {
    console.log(`Note: PR targets ${pr.base.ref}, not ${pr.base.repo.default_branch}.`);
  }

  const sha = pr.head.sha;
  const [checks, comments] = await Promise.all([
    gh<{ check_runs: { name: string; status: string; conclusion: string | null }[] }>(
      `/repos/${repo}/commits/${sha}/check-runs?per_page=100`,
    ),
    listComments(pr.number),
  ]);

  const ci = ciStateFrom(checks.check_runs, requiredChecks);
  const review = codexVerdictFor(comments, sha, trusted);
  const { iteration, alreadyDispatchedForSha } = iterationsFrom(comments, sha, trusted);
  const action = decide({
    ci,
    review,
    iteration,
    maxIterations,
    stopRequested: labels.includes(LABELS.stop),
    alreadyDispatchedForSha,
  });
  console.log(JSON.stringify({ pr: pr.number, sha, ci, review, iteration, maxIterations, action }));

  const issue = `/repos/${repo}/issues/${pr.number}`;
  const comment = (body: string) =>
    gh(`${issue}/comments`, { method: "POST", body: JSON.stringify({ body }) });
  const addLabels = (names: string[]) =>
    gh(`${issue}/labels`, { method: "POST", body: JSON.stringify({ labels: names }) });
  const removeLabel = (name: string) =>
    labels.includes(name)
      ? gh(`${issue}/labels/${encodeURIComponent(name)}`, { method: "DELETE" })
      : Promise.resolve();

  switch (action.kind) {
    case "wait":
    case "stopped":
      return;

    case "ready":
      if (labels.includes(LABELS.ready)) return;
      await act("Mark ready for human review", async () => {
        await removeLabel(LABELS.needsHuman);
        await addLabels([LABELS.ready]);
        await comment(
          `✅ **Agent loop finished.** CI is green and Codex approved commit \`${sha.slice(0, 7)}\` ` +
            `after ${iteration} fix round(s).\n\nThis PR now needs **human review and approval** before merge. ` +
            `Agents never merge.`,
        );
      });
      return;

    case "escalate":
      if (labels.includes(LABELS.needsHuman)) return;
      await act("Escalate to a human", async () => {
        await removeLabel(LABELS.ready);
        await addLabels([LABELS.needsHuman]);
        await comment(
          `🛑 **Agent loop stopped — human needed.** ${action.reason}\n\n${await failingCheckSummary(sha)}`,
        );
      });
      return;

    case "fix": {
      const failing = ci === "failure" ? await failingCheckSummary(sha) : "";
      const body = [
        iterationMarker(action.nextIteration, sha),
        `🔁 **Agent loop — fix round ${action.nextIteration}/${maxIterations}** for \`${sha.slice(0, 7)}\``,
        "",
        `Reason: ${action.reason}.`,
        failing ? `\n**Failing checks**\n${failing}` : "",
        review === "request_changes"
          ? "\n**Codex review:** see the latest comment marked _Codex review_ above for findings."
          : "",
        "\nClaude has been dispatched to address this feedback and push a fix to this branch.",
      ].join("\n");
      await act(`Dispatch Claude fix round ${action.nextIteration}`, async () => {
        await removeLabel(LABELS.ready);
        await comment(body);
        // Workflow definitions come from the default branch so a PR cannot
        // rewrite its own guardrails.
        await gh(`/repos/${repo}/actions/workflows/claude-fix.yml/dispatches`, {
          method: "POST",
          body: JSON.stringify({
            ref: pr.base.repo.default_branch,
            inputs: { pr_number: String(pr.number), iteration: String(action.nextIteration) },
          }),
        });
      });
      return;
    }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
