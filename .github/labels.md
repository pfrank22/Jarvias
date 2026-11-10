# Agent-loop labels

Create these labels once (Issues → Labels → New label). See docs/AGENT_WORKFLOW.md.

| Label                    | Who sets it           | Meaning                                              |
| ------------------------ | --------------------- | ---------------------------------------------------- |
| `agent-loop`             | Claude or a human     | Opt this PR into Codex review + automatic fix rounds |
| `codex-review`           | A human               | Codex review only, no automatic fix rounds           |
| `agent-ready-for-review` | Orchestrator          | CI green + Codex approved — needs human approval     |
| `agent-needs-human`      | Orchestrator          | Retry limit reached — human must step in             |
| `agent-stop`             | A human (kill switch) | Stop all agent activity on this PR immediately       |
