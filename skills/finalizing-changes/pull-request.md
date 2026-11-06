# Compose the pull request

Follow the repository's pull request template and title convention when present. Otherwise, inspect the complete `base...HEAD` diff and commit range, then write a description that stands on its own. Do not use only the latest commit, paste the commit log, or make reviewers reconstruct the purpose from the diff. A pull request should have one coherent goal; stop and split independent changes before publishing.

## Title

Use a short, specific title that summarizes the primary change. When the repository has no title convention, write it as an imperative sentence. Avoid vague titles such as `Fix bug`, `Update code`, or `Phase 1`.

## Body

Keep **What** and **Why** as the required core of the body:

```markdown
## What

<Summarize the resulting behavior and coherent scope. Mention major implementation
decisions or boundaries only when they help reviewers understand the change.>

## Why

<State the problem or opportunity, its impact, and the intended outcome. Explain why
this approach was chosen, including relevant constraints or tradeoffs.>

## Verification

- `<command or scenario>` — <observed result>
```

- Describe outcomes and behavior under **What**, not a file inventory or line-by-line retelling of the diff. State intentional non-goals when the scope could be misunderstood.
- Put decision context that the code cannot preserve under **Why**. Links to issues, incidents, or design documents supplement this explanation; they do not replace it.
- For an active OpenSpec change, draw **What** from the proposal's scope and the delta specs' requirements, and **Why** from the proposal's motivation. Write both as standalone prose, because reviewers may not use OpenSpec, and link the change directory for the full proposal and specs.
- Report only fresh, observed checks under **Verification**. Include reproduction and validation steps for bug fixes, and before/after evidence for user-visible visual changes.
- Add a **Risks** section when the change has breaking behavior, migrations, rollout requirements, feature flags, known shortcomings, or meaningful operational risk.
- Use an issue-closing keyword such as `Closes #123` only when the pull request targets the default branch and fully resolves that issue. Otherwise, use a plain reference.
- Remove placeholders and omit optional sections that do not apply.

## Example

For a branch that fixes todos snapping back to done after being unchecked:

```markdown
Persist unchecking a completed todo

## What

`PATCH /todos/:id` with `{"completed": false}` now marks the todo as open again. Other
partial updates keep ignoring fields that are absent from the request body.

## Why

A refactor filtered update fields by truthiness, so `false` was dropped and the frontend
showed unchecked todos as done after a reload. Filtering by `undefined` restores the
intended partial-update contract.

## Verification

- `npm test` — 23 passing, including the new uncheck regression test that failed before the fix
- `curl -X PATCH …/todos/<id> -d '{"completed":false}'` then `GET` — returns `completed: false`
```

## Final check

Review the title and body against the final diff immediately before creating the pull request.
