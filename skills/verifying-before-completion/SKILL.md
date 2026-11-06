---
name: verifying-before-completion
description: Required completion gate before the final report of every coding task, even when tests already pass; checks open Hunk review notes, todo and OpenSpec task lists, leftover background processes, and fresh evidence for each claim that work is done, fixed, passing, reviewed, ready, committed, or integrated.
metadata:
  opencode/autoinvoke: true
---

# Verifying Before Completion

Report only the state proven by fresh evidence. Expectations, stale output, and subagent reports are not completion evidence.

## Build the evidence map

Before a material claim:

1. Name the observable evidence that would prove it.
2. Run or inspect that evidence after the final change.
3. Check exit status and enough output to catch failures, skipped coverage, partial execution, or the wrong target.
4. Compare the result with every acceptance criterion and repository convention.
5. State exactly what passed, failed, or could not run.

Use the OpenCode tool that exercises the real boundary:

- `shell` for focused tests, builds, type checks, linters, finite CLI smoke tests, and `gh` for pull request and issue state;
- `shell` with `background: true` to start long-running services, with output in a log file you `read`;
- the `browser` namespace through `execute`, when available, to exercise changed UI behavior and inspect the rendered result;
- `read` to inspect generated artifacts and documents, and `webfetch` for URLs;
- a scripted debugger run or stack dump through `shell` when the claim depends on runtime state that ordinary output cannot establish.

Choose checks proportional to the change and risk. Run the changed path through its real entry point. Do not run an unrelated expensive suite solely as a ritual.

## Delegated work

Treat `subagent` results as leads. Inspect the resulting artifact and independently run the checks required for the final claim. A completed agent job proves only that the agent returned.

## OpenSpec tasks

An OpenSpec change is active when `openspec list --json` reports a non-null `root` and the current work implements one of the listed changes: the change the user or the `openspec-apply-change` skill named, otherwise the only listed change. If several are listed and the work does not show which one it implements, ask. Without the CLI, a root, or a matching change, skip this section. Find the artifacts with `openspec status --change <name> --json` (`changeRoot`, `artifactPaths`) and open them with `read`.

Every checked `- [x]` item in the change's `tasks.md` is a completion claim. Check an item only after fresh evidence proves it, and uncheck an item whose evidence later fails. Only the main session checks items; a subagent's report is a lead, as under Delegated work. Before claiming the change is complete, confirm that `openspec list --json` shows equal `completedTasks` and `totalTasks` for it, and that `openspec validate <name> --strict` passes. Report any failure as remaining work.

## Review notes

Notes in a live Hunk session are requests from the user or other agents. Act on them before any completion claim:

1. Run `hunk session list --json` and keep the sessions whose `repoRoot` matches the workspace. If none matches, skip this check.
2. After the final change, run `hunk session comment list <selector> --type all --json`, using `--repo <repo-root>` or, when several sessions match, each `sessionId`.
3. Group notes into threads by `parentId`. A thread is settled when its latest reply starts with `Fixed:`, `Rejected:`, `Duplicate of`, or `Answered:`; every other thread is open, including user notes without replies and threads a later user reply reopened.
4. Handle every open thread within the task's authorization: fix and validate it, then reply `Fixed:` with a `Validation:` rationale; push back with `Rejected:` and the concrete reason; or reply `Answered:` to a question. Use `hunk session comment add <selector> --reply-to <note-id> --summary <text> [--rationale <text>]`.
5. Report every thread that stays open, such as one outside the task's scope or awaiting the user, and do not claim completion of the work it covers. Accepted findings from an inspection-only review are that review's result; report them instead of fixing them.

## Completion gate

Confirm all acceptance items in the session's todo list are complete when one exists, and for an active OpenSpec change, every `tasks.md` item. If any item is blocked, report that work remains and do not claim completion. Confirm every open Hunk thread is handled or reported. Stop background processes you started, and confirm affected callsites, tests, documentation, and generated artifacts are updated or intentionally unchanged.

## Reporting

Lead with the result. Cite the commands or authoritative artifacts that support each material claim, include material caveats, and give the next concrete action when work remains. Never write “should pass,” “looks correct,” or equivalent language without evidence.
