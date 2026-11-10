# Jarvis

AI project-management platform for multi-company builders and service businesses.
**Sprint 1:** mobile dashboard, project details, approval queue, multi-company
architecture — on fictional data.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 7 · Vitest.

## Quick start

```bash
cp .env.example .env            # local, fictional-data settings
npm install                     # also generates the Prisma client
npm run db:migrate              # create tables in jarvis_dev
npm run db:seed                 # load fictional companies, projects, approvals
npm run dev                     # http://localhost:3000
```

Postgres setup (once), matching `.env.example`:

```bash
createuser -P --createdb jarvis      # password: jarvis_local_dev (local only)
createdb -O jarvis jarvis_dev
createdb -O jarvis jarvis_test
DATABASE_URL=postgresql://jarvis:jarvis_local_dev@localhost:5432/jarvis_test npx prisma migrate deploy
```

You are signed in as **Alex Rivera** (fictional), who is Owner of Northwind
Builders, Manager at Bluepeak Renovations and Viewer at Cedar & Stone Interiors —
use the company switcher at the top to see role-based behaviour.

## Scripts

| Command                    |                                                          |
| -------------------------- | -------------------------------------------------------- |
| `npm run check`            | lint + typecheck + unit tests                            |
| `npm run test:integration` | Postgres integration tests (tenant isolation, approvals) |
| `npm run build`            | production build                                         |
| `npm run db:reset`         | drop, migrate and reseed the dev database                |

## Project docs

- [AGENTS.md](AGENTS.md) — architecture, coding standards, testing & security rules (for humans and agents)
- [docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md) — Claude ⇄ Codex automated development loop
- [docs/EXTERNAL_SETUP.md](docs/EXTERNAL_SETUP.md) — what the owner must configure (secrets, apps, protection)
- [docs/OPEN_DECISIONS.md](docs/OPEN_DECISIONS.md) — product decisions awaiting the owner
