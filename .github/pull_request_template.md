## Summary

<!-- What does this change do and why? -->

## Changes

-

## Testing

- [ ] `npm run lint` / `npm run typecheck`
- [ ] `npm test` (unit)
- [ ] `npm run test:integration` (Postgres)
- [ ] Manually checked on a phone-sized viewport (UI changes)

## Security & tenancy checklist

- [ ] All tenant data access goes through `src/server/*` with a `TenantContext`
- [ ] Server-side authorization for every mutation
- [ ] No secrets, credentials or real customer data
- [ ] No new paid services or external network calls

## Agent loop

- Author: <!-- human | claude -->
- Add the `agent-loop` label to request Codex review + automatic fix rounds.
