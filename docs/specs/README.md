# Feature specs

One file per feature. Each is the contract that tests encode and code satisfies. Scenario IDs are stable forever — renumbering breaks traceability; deprecate instead.

| Spec | Prefix | Phase | Status |
|---|---|---|---|
| [teams.md](teams.md) | `TEAM` | 5 | Approved |
| [authentication.md](authentication.md) | `AUTH` | 1, revised 5 | Approved |
| [goals.md](goals.md) | `GOAL` | 2, revised 5 | Approved |
| [daily-tracking.md](daily-tracking.md) | `DT` | 2, revised 5 | Approved |
| [exceptions.md](exceptions.md) | `EXC` | 2, revised 5 | Approved |
| [partner-check-ins.md](partner-check-ins.md) | `PCI` | 3, revised 5 | Approved |
| [contract-and-vision.md](contract-and-vision.md) | `CV` | 3, revised 5 | Approved |
| [history.md](history.md) | `HIST` | 3, revised 5 | Approved |
| [admin.md](admin.md) | `ADM` | 5 | Approved |
| [export.md](export.md) | `EXP` | after 5 | Approved |
| [site-identity.md](site-identity.md) | `ID` | 4 | Approved |
| [hover-feedback.md](hover-feedback.md) | `HOVER` | 4, revised 5 | Approved |
| [appearance.md](appearance.md) | `THEME` | 4, revised 5 | Approved |
| [launch-readiness.md](launch-readiness.md) | `LAUNCH` | 4, revised 5 | Approved |

*Approved* means Nigel has seen the decisions behind it (ADR-0001/0002/0005) and Claude may implement it without asking. Refinements discovered during implementation are made in the same PR, docs commit first, and called out in the PR body.

## Retired

These IDs are never reused.

| IDs | Was | Retired by |
|---|---|---|
| `ROLE-01`…`ROLE-08` (roles-and-permissions.md) | owner / partner / viewer permissions | [ADR-0005](../adr/0005-every-student-owns-a-team.md) — replaced by `TEAM-*` |
| `PPL-01`…`PPL-07` (people.md) | the owner's `/people` page and promotions | ADR-0005 — every student is a partner; `PPL-06`'s share-the-link empty state lives on as `PCI-07` |
| `REM` (owner-reminders.md) | planned owner browser reminders | ADR-0005 T5 — no reminders |
| `AUTH-04` | the `OWNER_EMAIL` account becomes owner | ADR-0005 T3 |

## Format

```markdown
# <Feature>

**Status:** Approved | Planned | Implemented
**Phase:** N
**Routes:** /x, /y
**Rules:** links into DATA_MODEL.md that this spec relies on

## Purpose
One paragraph: what this is for and who it serves.

## Scenarios
### PREFIX-NN <one-line title>
- **Given** <state>
- **When** <action>
- **Then** <observable result>

## UI
Layout, copy that tests assert on, states (empty, loading, error).

## Out of scope
What this deliberately does not do.
```

## Writing scenarios

- One observable outcome per scenario. If a "Then" has three unrelated assertions, it's three scenarios.
- Use the exact UI copy in quotes (`"Check in"`) when a test will look for it; the copy is then a contract too.
- Dates in examples use the contract timeline (start Saturday 2026-09-19) so examples double as test fixtures. People in examples are the seeded fake students: Avery Adams, Blake Brown, Casey Clark, and Dana Diaz (who signs in for the first time).
- Ownership scenarios come in pairs: the control is absent on a teammate's page, **and** the direct action with a teammate's id is rejected.
