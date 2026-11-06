---
name: finalizing-changes
description: Validates a completed change set and performs the outcome the user picks from the feasible ones, such as committing in place, merging locally, publishing a pull request, or keeping the work as is. Use when a coherent set of changes is complete and needs to be validated, committed, merged, published as a pull request, or retained, including when the user wants to wrap up or ship finished work, whether the changes are uncommitted or already on a branch.
metadata:
  opencode/autoinvoke: true
---

# Finalizing Changes

Validate a completed increment, present only feasible dispositions, and perform the authorized action without assuming the work already lives on a feature branch.

Track progress with this checklist:

```
Finalizing progress:
- [ ] State established and intended change set identified
- [ ] Fresh validation passed
- [ ] OpenSpec checks passed (active change only)
- [ ] Outcome selected through `question`
- [ ] Selected outcome executed and its result verified
```

## Establish state

1. Inspect the current branch, worktree, status, remotes, recent commits, and the remote default branch.
2. Read the repository instructions, and an existing pull request with `gh pr view <number>` when one is relevant.
3. Identify the intended change set and whether it is uncommitted, committed relative to a base branch, or both. Separate unrelated changes instead of including them.
4. Resolve the base branch only for merge or pull-request outcomes. If the intended changes are on the base branch, determine whether repository policy permits committing there or requires a topic branch.
5. Stop on detached HEAD, unexpected unrelated changes, or an ambiguous change set. Report the recovery needed instead of guessing.
6. Run fresh validation proportional to the intended changes. Do not present failing changes as ready.

## OpenSpec changes

An OpenSpec change is active when `openspec list --json` reports a non-null `root` and the change set implements one of the listed changes: the change the user named, otherwise the only listed change. If several are listed and the change set does not show which one it implements, ask. Without the CLI, a root, or a matching change, skip this section. Find the artifacts with `openspec status --change <name> --json` (`changeRoot`, `artifactPaths`) and open them with `read`.

For an active change:

- The change's directory under `openspec/changes/` belongs to the intended change set; commit it together with the code.
- Apply the OpenSpec checks in `verifying-before-completion` before presenting outcomes: every `tasks.md` item checked with evidence, and `openspec validate <name> --strict` passing.
- Never archive the change as part of finalizing. Archiving moves it into `openspec/changes/archive/` and merges its delta specs into `openspec/specs/`; do it only after the code reaches the base branch, as a separate request. Name the `openspec-archive-change` skill for `<name>` as the next step in the final report.

## Present outcomes

Use one `question` call containing only actions that are currently feasible:

- commit the intended changes on the current branch;
- merge a completed topic branch into the base branch locally;
- publish the intended changes as a pull request, creating a topic branch first when required;
- keep the changes, branch, and worktree unchanged.

For a commit choice, include the current branch, intended files, proposed message, and validation result. For merge or pull-request choices, include the base, remote, source branch or planned new branch, title or merge mode, validation result, and preservation policy. Before offering a pull request, read [`pull-request.md`](pull-request.md) and draft the title it describes. Mark the safest complete outcome as recommended.

The selection authorizes only the actions named in that option. Creating a pull request may include creating a topic branch, committing, and pushing only when those steps were shown in the selected option.

## Execute

### Commit in place

Offer this only when repository policy permits committing to the current branch. Load the `committing-changes` skill to include only the intended changes, then report the commit and preserved working state.

### Merge locally

Offer this only when a completed topic branch differs from the base branch and has no intended uncommitted changes. Update the base only when repository policy and worktree state make it safe. Merge without force, validate the merged result, and preserve the topic branch and worktree.

### Push and create a pull request

Use the repository's configured forge CLI, such as `gh`. If the intended changes are uncommitted, create a topic branch first when repository policy requires one, then load the `committing-changes` skill to include only those changes. Push without force and preserve the local branch and worktree.

Write the body as [`pull-request.md`](pull-request.md) describes and run its final check. Create the pull request with the approved title and body, then report its URL.

### Keep

Leave the intended changes, branch, and worktree unchanged. Report their state, names, and paths.

Load the `verifying-before-completion` skill before every claim about validation, commits, merges, pushes, or pull requests.
