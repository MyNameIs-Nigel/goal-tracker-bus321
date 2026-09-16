# Open Questions

**None right now.**

The initial scoping round (25 questions) was answered on 2026-09-15 and is recorded as decisions in [adr/0001-initial-scope.md](adr/0001-initial-scope.md). Defaults Claude chose to fill the gaps are in [adr/0002-gap-filling-defaults.md](adr/0002-gap-filling-defaults.md) and [adr/0003-public-repo-and-local-database.md](adr/0003-public-repo-and-local-database.md) — veto any of them by replying with its ID (e.g. "G4: no, use overlap").

## How a question gets added

Claude adds a question here only when different answers would lead to **materially different work**. Everything else is a judgment call Claude makes and records in an ADR. Every question must carry a **(Recommended)** option so that "go with the recommendation" is always a complete answer.

### Template

```markdown
### <ID>. <Question>?
- [ ] **<Option A> (Recommended)** — why
- [ ] <Option B> — trade-off

**Your answer:**
```
