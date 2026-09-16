<!--
Title must be a Conventional Commit — it becomes the commit on main after
squash-merge. e.g. `feat(goals): owner can add, edit, archive goals`
-->

## What

<!-- One or two sentences. What changes for a person using the app? -->

## Spec

<!--
Link the spec this implements and list the scenario IDs covered, each with
the test that names it. Foundation/tooling PRs: write "none — tooling".
-->

- Spec:
- Scenarios covered:

## Docs changed

<!-- Which docs, and why. "No doc changes needed" is a valid answer if it was a conscious one. -->

## Checklist

- [ ] Docs were the first commit on this branch
- [ ] Tests were written before the code and **failed first for the right reason** — say which:
- [ ] `npm run check` passes locally (lint, format, typecheck, unit, build)
- [ ] E2E run locally if this touches a flow
- [ ] `npm run trace` shows no new gaps for this spec
