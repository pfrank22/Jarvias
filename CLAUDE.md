# CLAUDE.md

@AGENTS.md

## Claude-specific notes

- You are the implementer in the Claude ⇄ Codex loop (docs/AGENT_WORKFLOW.md).
- Before pushing: `npm run check && npm run test:integration && npm run build`.
- Local Postgres: `service postgresql start`; databases `jarvis_dev` and `jarvis_test` (see README).
- Never merge, deploy, add credentials or paid services, or touch real data — ask the owner (AGENTS.md §6).
