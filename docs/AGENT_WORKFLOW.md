# Claude ⇄ Codex agent workflow

Goal: features move from idea to a reviewed, tested PR with minimal manual work,
and **nothing reaches `main` or production without the owner's approval**.

## Roles

| Actor             | Does                                                                 | Never                                          |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| Claude Code       | Implements features on branches, opens PRs, fixes review/CI findings | Merges, deploys, edits workflows, adds secrets |
| OpenAI Codex      | Reviews PRs read-only against AGENTS.md, posts a verdict             | Edits code, pushes, approves via GitHub        |
| Orchestrator (GH) | Reads CI + Codex verdict, decides next step, dispatches fix rounds   | Merges, approves, pushes code                  |
| Owner (human)     | Approves and merges PRs, approves production deploys, credentials    | —                                              |

## Loop

```
 Claude: branch + commits ──► PR to main (label: agent-loop)
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
        CI (ci.yml, "ci")               Codex Review (codex-review.yml)
              │                                       │  comment: <!-- codex-review sha=… verdict=… -->
              └──────────────► Agent Loop (agent-loop.yml, on workflow_run) ◄──┘
                                  │  decide(ci, review, iteration, max, stop)
       ┌─────────────┬────────────┼────────────────────┬─────────────────────┐
       ▼             ▼            ▼                    ▼                     ▼
     wait        stopped     ready (label         fix (comment +        escalate (label
 (other side   (agent-stop   agent-ready-for-     dispatch claude-     agent-needs-human)
  pending)       label)      review) ─► OWNER     fix.yml) ─► Claude
                              reviews & merges     pushes ─► CI + Codex rerun ─► loop
```

### Stop conditions

- **Success:** required check `ci` is green **and** Codex's latest verdict for the _current head commit_ is `approve` → `agent-ready-for-review`. The owner then reviews and merges.
- **Retry limit:** after `AGENT_LOOP_MAX_ITERATIONS` fix rounds (default **3**) without success → `agent-needs-human` with a summary of what is still failing.
- **Kill switch:** owner adds `agent-stop` → the orchestrator does nothing further.

### Safety properties

- **Fail closed.** Missing/unparseable Codex output is treated as `REQUEST_CHANGES`; missing CI is `pending`.
- **No forged verdicts.** Verdict and iteration markers only count when posted by `github-actions[bot]`; marker-like text in model output is stripped before posting.
- **Idempotent.** CI and Codex both trigger the orchestrator; it records the head SHA in each fix-round marker and never dispatches twice for the same commit.
- **Guardrails can't be edited by the PR under review.** `workflow_run` and the dispatched `claude-fix.yml` always run the definitions (and the Claude prompt template) from the default branch.
- **No forks.** Fork PRs never get secrets and are skipped by every agent workflow.
- **Least privilege.** Codex runs in a read-only sandbox. Claude runs with an allow-list of tools and explicit denials for `gh pr merge`, force-push, pushing to `main`, `curl`/`wget`.
- **Branch protection** (`.github/rulesets/main-protection.json`) requires a PR, a code-owner (owner) approval after the last push, resolved threads, and a green `ci` check — so even a misbehaving agent cannot land code on `main`.

## Running it

1. Complete docs/EXTERNAL_SETUP.md (secrets, apps, variables, ruleset).
2. Claude opens a PR and adds the `agent-loop` label.
3. Watch the PR conversation: Codex review comments, fix-round comments, Claude's summaries.
4. When `agent-ready-for-review` appears, review and merge (or comment `@claude …` for changes).

Manual tools:

- Re-evaluate a PR: Actions → Agent Loop → Run workflow (`pr_number`, optional `dry_run`).
- Re-run a review: Actions → Codex Review → Run workflow.
- Ask Claude directly: comment `@claude <request>` on the PR (owner/collaborators only).

## Interim mode (before secrets are configured)

Until the API-key-based workflows are enabled, the same loop can run with this
Claude Code session as the implementer:

- Codex reviews via the **Codex GitHub integration** (comment `@codex review` on the PR, or enable automatic reviews in Codex settings) — uses your ChatGPT plan, no API key in GitHub.
- The Claude Code session subscribes to the PR's activity, reads Codex's review comments, pushes fixes, and stops after the same 3-round limit, then hands the PR to you.

## Tuning

| Setting                                   | Where                                            | Default     |
| ----------------------------------------- | ------------------------------------------------ | ----------- |
| `AGENT_LOOP_ENABLED`                      | Repo variable                                    | unset (off) |
| `CODEX_REVIEW_ENABLED`                    | Repo variable                                    | unset (off) |
| `AGENT_LOOP_MAX_ITERATIONS`               | Repo variable                                    | `3`         |
| Review criteria                           | `.github/codex/review-prompt.md` + AGENTS.md     | —           |
| Claude fix instructions / tool allow-list | `.github/claude/fix-prompt.md`, `claude-fix.yml` | —           |
