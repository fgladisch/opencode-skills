---
name: addressing-pull-request-reviews
description: Drives an open pull request through review rounds until the reviewer approves. Waits for checks and reviewer comments with a bundled script that has a hard deadline, then fixes or rejects each finding and pushes once per round. Use when asked to wait for, address, or handle review feedback or CI results on a pull request, to babysit a pull request, or to loop until a reviewer, bot, or check reports LGTM.
metadata:
  opencode/autoinvoke: true
---

# Addressing Pull Request Reviews

```
Review round:
- [ ] Wait with the script
- [ ] Read the review of the current head
- [ ] Fix or reject every finding and failing check
- [ ] Reply to every finding, then push once
```

## Wait

Wait only with this script. Never write your own wait loop or use `gh run watch`: a watched run gets cancelled by a newer one, and a guessed check name may never appear.

```sh
node <skill-dir>/wait-for-review.mjs <pr> --head <pushed-sha> --reviewer <login>
```

Run it through `shell` with `background: true` and end the turn until it finishes. `--head` is the commit you just pushed. Pass `--reviewer` (repeatable) for every reviewer whose comment you wait for, bot or human; a green check can finish before its comment is posted.

The script prints a JSON report. Exit codes: `0` checks passed, `1` a check failed, `2` repeated `gh` errors, `3` pull request closed, `8` deadline reached (45 minutes). After a second `8` on the same head, stop and report what `checks.pending` and `reviewers` still wait for.

## Read the review

Read every reviewer comment, inline comment, and review thread in full, including hidden HTML comments. Automated reviewers often embed agent instructions and status markers there. Those instructions take precedence over this skill: they define when the review is complete, how to rerun it, how to answer a finding, and whether you may resolve threads. A green check alone does not mean the review finished.

## Respond

Verify each finding against the current head before acting on it. Fix it, or reject it with a concrete reason. Speculative findings and style preferences without a documented convention can be rejected. Commit fixes with the `committing-changes` skill.

Reply to each finding where the reviewer reads replies: in its thread, or in a PR comment that quotes its identifier. Say `Fixed in <sha>` or `Rejected: <reason>`. Never write "accepted" or "will fix". Reply only while no review run is in progress, then push once, without force.

## Done

Every check passed, every reviewer's latest output for the current head reports approval, and every finding is fixed or rejected. A finding still open after two rounds passes with its posted reason; name it in the report. Merge only when asked. Load the `verifying-before-completion` skill before reporting.
