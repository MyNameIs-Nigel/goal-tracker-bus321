# Architecture Decision Records

One file per decision (or per batch of related decisions), numbered, never edited after acceptance. To change a decision, write a new ADR that says *"Supersedes ADR-000N"* and mark the old one *Superseded* in its status line — that's the only edit an accepted ADR gets.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-initial-scope.md) | Initial scope — Nigel's answers to the scoping questions | Accepted 2026-09-15 |
| [0002](0002-gap-filling-defaults.md) | Gap-filling defaults chosen by Claude | Accepted 2026-09-15 (veto by ID) |
| [0003](0003-public-repo-and-local-database.md) | Repository is public; local database runs in Docker | Accepted 2026-09-16 |
| [0004](0004-preview-has-no-database.md) | Preview deployments have no database — production only | Accepted 2026-09-17 |

## Template

```markdown
# ADR-000N: <title>

**Status:** Proposed | Accepted <date> | Superseded by ADR-000M
**Deciders:** Nigel / Claude

## Context
What situation forces a decision, and what constraints apply.

## Decision
What we're doing, stated so that a reader can act on it.

## Consequences
What becomes easier, what becomes harder, what we've given up.
```
