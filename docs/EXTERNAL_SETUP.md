# External setup checklist

Everything in the repository is built and tested locally. The steps below need
the owner (you) because they involve accounts, credentials, billing or
repository settings. **Never paste secrets into chat, issues or commits** —
enter them only in GitHub's encrypted secrets UI.

Status legend: ✅ verified · ⚠️ needs your decision · ⬜ to do

## 0. Repository visibility ⚠️

- ✅ Ownership verified: the authenticated GitHub account is `pfrank22`, the owner of `pfrank22/Jarvias`.
- ⚠️ The repository is currently **public**, not private. For a commercial product you probably want it private:
  Settings → General → Danger Zone → Change visibility → Private.
- Trade-off: on a **free** GitHub plan, private repositories do **not** enforce rulesets/branch protection or
  environment required reviewers (these need GitHub Pro, ~US$4/month — a paid-service decision). Public repos get them free.

## 1. GitHub Actions ⬜

1. Settings → Actions → General → Workflow permissions: **Read repository contents** (default), and
   ✅ "Allow GitHub Actions to create and approve pull requests" **unchecked**.
2. Settings → Secrets and variables → Actions → **Variables** (not secrets):
   - `AGENT_LOOP_ENABLED` = `true` (turns on Agent Loop + Claude Fix)
   - `CODEX_REVIEW_ENABLED` = `true` (turns on Codex Review)
   - `AGENT_LOOP_MAX_ITERATIONS` = `3` (optional)
3. Create the labels listed in `.github/labels.md`.

CI (`ci.yml`) needs nothing else — it uses a throwaway Postgres service container.

## 2. Protect `main` ⬜

Settings → Rules → Rulesets → New ruleset → **Import a ruleset** → choose
`.github/rulesets/main-protection.json`. It requires: PR, 1 approval from the code owner
(you) after the last push, resolved conversations, green `ci`, linear history, no force-push/deletion,
no bypass actors.

## 3. Production approval gate ⬜

Settings → Environments → New environment `production` → **Required reviewers: pfrank22**,
Deployment branches: `main` only. `deploy-production.yml` uses it; nothing deploys without your click.

## 4. OpenAI Codex reviews ⬜ (paid — needs your authorization)

Choose one:

**A. Codex GitHub integration (no API key in GitHub; uses your ChatGPT plan)**

1. chatgpt.com → Codex → Settings → connect GitHub and grant access to `pfrank22/Jarvias`.
2. Enable **Code review** for the repo (automatic reviews, or comment `@codex review` on a PR).
3. Codex reads `AGENTS.md` automatically. Its reviews appear as PR reviews from the Codex bot.

**B. `openai/codex-action` in CI (fully automated loop; pay-per-use OpenAI API)**

1. Create an OpenAI API key restricted to this use, with a monthly budget limit in the OpenAI dashboard.
2. Add it as repository **secret** `OPENAI_API_KEY` (Settings → Secrets and variables → Actions → Secrets).
3. Set variable `CODEX_REVIEW_ENABLED=true`.
4. On the first run, confirm the action's inputs still match `.github/workflows/codex-review.yml`
   (`openai-api-key`, `prompt-file`, `output-file`, `sandbox`, `safety-strategy`); see the action's README.

Option B is required for the fully automatic loop; A works with the interim mode in docs/AGENT_WORKFLOW.md.

## 5. Claude Code in GitHub Actions ⬜ (paid — needs your authorization)

1. Install the **Claude GitHub App** on `pfrank22/Jarvias` (github.com/apps/claude, or run
   `/install-github-app` in Claude Code). Its token is what lets Claude's fix pushes re-trigger CI and Codex.
2. Add **one** repository secret:
   - `ANTHROPIC_API_KEY` (Anthropic Console, pay-per-use; set a spend limit), **or**
   - `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`, uses your Claude subscription).
3. Set variable `AGENT_LOOP_ENABLED=true`.

## 6. Bootstrap order

The orchestrator and Claude Fix workflows run from `main`, so they only become active after the PR
that adds them is merged **by you**. Suggested order: 0 → 2 → 3 → merge the setup PR → 1 → 4 → 5.

## 7. Free security features (recommended) ⬜

Settings → Code security: enable Dependabot alerts, secret scanning and push protection.
`.github/dependabot.yml` is already configured.
