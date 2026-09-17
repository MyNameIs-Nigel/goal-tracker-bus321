# Feature specs

One file per feature. Each is the contract that tests encode and code satisfies. Scenario IDs are stable forever — renumbering breaks traceability; deprecate instead.

| Spec | Prefix | Phase | Status |
|---|---|---|---|
| [authentication.md](authentication.md) | `AUTH` | 1 | Approved |
| [roles-and-permissions.md](roles-and-permissions.md) | `ROLE` | 1 | Approved |
| [people.md](people.md) | `PPL` | 1 | Approved |
| [goals.md](goals.md) | `GOAL` | 2 | Approved |
| [daily-tracking.md](daily-tracking.md) | `DT` | 2 | Approved |
| [exceptions.md](exceptions.md) | `EXC` | 2 | Approved |
| [partner-check-ins.md](partner-check-ins.md) | `PCI` | 3 | Approved |
| [contract-and-vision.md](contract-and-vision.md) | `CV` | 3 | Approved |
| [history.md](history.md) | `HIST` | 3 | Approved |
| [site-identity.md](site-identity.md) | `ID` | 4 | Approved |
| [owner-reminders.md](owner-reminders.md) | `REM` | 5 | Planned — scenarios not yet written |

*Approved* means Nigel has seen the decisions behind it (ADR-0001/0002) and Claude may implement it without asking. Refinements discovered during implementation are made in the same PR, docs commit first, and called out in the PR body.

## Format

```markdown
# <Feature>

**Status:** Approved | Planned | Implemented
**Phase:** N
**Routes:** /x, /y
**Rules:** links into DATA_MODEL.md that this spec relies on

## Purpose
One paragraph: what this is for and who it serves.

## Roles
What each of owner / partner / viewer can do here.

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
- Use the exact UI copy in quotes (`"I checked today"`) when a test will look for it; the copy is then a contract too.
- Dates in examples use the contract timeline (start Saturday 2026-09-19) so examples double as test fixtures.
- Authorization scenarios come in pairs: the control is absent for the wrong role, **and** the direct action is rejected.
