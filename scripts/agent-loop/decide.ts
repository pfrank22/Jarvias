/**
 * Pure decision logic for the Claude ⇄ Codex agent loop.
 * No I/O here — `run.ts` gathers state from GitHub and acts on the result.
 * Runs under Node's built-in type stripping (no enums / namespaces allowed).
 */

export type CiState = "pending" | "success" | "failure";
export type ReviewState = "pending" | "approve" | "request_changes";

export interface LoopState {
  ci: CiState;
  review: ReviewState;
  /** Fix rounds already dispatched to Claude for this PR. */
  iteration: number;
  maxIterations: number;
  /** A human added the `agent-stop` label. */
  stopRequested: boolean;
  /** A fix round was already dispatched for this exact head commit. */
  alreadyDispatchedForSha: boolean;
}

export type LoopAction =
  | { kind: "stopped"; reason: string }
  | { kind: "wait"; reason: string }
  | { kind: "ready"; reason: string }
  | { kind: "escalate"; reason: string }
  | { kind: "fix"; nextIteration: number; reason: string };

export function decide(s: LoopState): LoopAction {
  if (s.stopRequested) return { kind: "stopped", reason: "A human added the agent-stop label." };
  if (s.alreadyDispatchedForSha) {
    return { kind: "wait", reason: "Claude is already working on this commit." };
  }
  if (s.ci === "pending" || s.review === "pending") {
    return { kind: "wait", reason: `Waiting for ${s.ci === "pending" ? "CI" : "Codex review"}.` };
  }
  if (s.ci === "success" && s.review === "approve") {
    return { kind: "ready", reason: "Tests pass and Codex approved. Ready for human review." };
  }
  if (s.iteration >= s.maxIterations) {
    return {
      kind: "escalate",
      reason: `Retry limit reached (${s.iteration}/${s.maxIterations}) with ${describe(s)}.`,
    };
  }
  return { kind: "fix", nextIteration: s.iteration + 1, reason: describe(s) };
}

function describe(s: Pick<LoopState, "ci" | "review">): string {
  const parts: string[] = [];
  if (s.ci === "failure") parts.push("failing CI");
  if (s.review === "request_changes") parts.push("Codex requested changes");
  return parts.join(" and ") || "no blocking issues";
}

// ---- Markers embedded in PR comments (HTML comments, invisible on GitHub) ----

const CODEX_MARKER =
  /<!--\s*codex-review\s+sha=([0-9a-f]{7,40})\s+verdict=(approve|request_changes)\s*-->/;
const ITERATION_MARKER = /<!--\s*agent-loop\s+iteration=(\d+)\s+sha=([0-9a-f]{7,40})\s*-->/;

export function codexMarker(sha: string, verdict: "approve" | "request_changes"): string {
  return `<!-- codex-review sha=${sha} verdict=${verdict} -->`;
}

export function iterationMarker(iteration: number, sha: string): string {
  return `<!-- agent-loop iteration=${iteration} sha=${sha} -->`;
}

export interface CommentLike {
  body?: string | null;
  /** Login of the comment author. Only trusted authors' markers count. */
  author?: string | null;
}

/**
 * Latest Codex verdict for `sha`, from comments posted by a trusted author
 * (the workflow bot). Markers from anyone else are ignored so a PR participant
 * cannot forge an approval.
 */
export function codexVerdictFor(
  comments: readonly CommentLike[],
  sha: string,
  trustedAuthors: readonly string[],
): ReviewState {
  let verdict: ReviewState = "pending";
  for (const c of comments) {
    if (!c.author || !trustedAuthors.includes(c.author)) continue;
    const m = c.body?.match(CODEX_MARKER);
    if (m && m[1] && sameSha(m[1], sha)) verdict = m[2] as ReviewState;
  }
  return verdict;
}

export function iterationsFrom(
  comments: readonly CommentLike[],
  sha: string,
  trustedAuthors: readonly string[],
): { iteration: number; alreadyDispatchedForSha: boolean } {
  let iteration = 0;
  let alreadyDispatchedForSha = false;
  for (const c of comments) {
    if (!c.author || !trustedAuthors.includes(c.author)) continue;
    const m = c.body?.match(ITERATION_MARKER);
    if (!m || !m[1] || !m[2]) continue;
    iteration = Math.max(iteration, Number(m[1]));
    if (sameSha(m[2], sha)) alreadyDispatchedForSha = true;
  }
  return { iteration, alreadyDispatchedForSha };
}

function sameSha(a: string, b: string): boolean {
  const n = Math.min(a.length, b.length);
  return n >= 7 && a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();
}

export type CheckConclusion = string | null;

/** Combine the required CI check runs into one state. Missing checks count as pending. */
export function ciStateFrom(
  checkRuns: readonly { name: string; status: string; conclusion: CheckConclusion }[],
  requiredChecks: readonly string[],
): CiState {
  let state: CiState = "success";
  for (const name of requiredChecks) {
    // Use the most recent run with this name (API returns newest first).
    const run = checkRuns.find((r) => r.name === name);
    if (!run || run.status !== "completed") {
      if (state === "success") state = "pending";
      continue;
    }
    if (!["success", "skipped", "neutral"].includes(run.conclusion ?? "")) state = "failure";
  }
  return state;
}
