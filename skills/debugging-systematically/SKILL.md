---
name: debugging-systematically
description: Finds the root cause of a failure by reproducing it, testing one falsifiable hypothesis at a time, and fixing the source with a regression check. Use when a bug report, failing test, build failure, performance regression, or other unexpected behavior needs diagnosis before a fix is proposed.
metadata:
  opencode/autoinvoke: true
---

# Debugging Systematically

Find evidence for the failure mechanism before changing production behavior. Observe the real state instead of guessing.

Track progress with this checklist:

```
Debugging progress:
- [ ] Symptom reproduced with the smallest reliable command or interaction
- [ ] Falsifiable hypothesis stated
- [ ] Cause confirmed by a distinguishing experiment
- [ ] Regression check added and failing before the fix
- [ ] Source of the fault fixed; original reproduction no longer fails
- [ ] Temporary diagnostics removed and started processes stopped
```

## Reproduce

1. Read the complete error, logs, stack trace, and relevant configuration.
2. Reproduce the symptom with the smallest reliable command or interaction. Run services, watchers, and other long-running processes with `shell` and `background: true`, redirecting their output to a log file you `read` later.
3. For UI failures, drive the exact path with the `browser` namespace through `execute` when it is available, or with the project's browser automation, and record the observed state.
4. If the failure is intermittent, record conditions and frequency rather than treating one pass as proof.

## Diagnose

1. Inspect recent changes, environment differences, and nearby working examples.
2. Trace definitions, implementations, types, and references with `grep` on word-bounded symbol names and targeted `read` calls. Confirm a symbolic relationship by reading the import or declaration, not only a textual match.
3. When the state cannot be observed from output, use the runtime's non-interactive inspection, such as a scripted debugger run, a stack dump, or one targeted temporary log line at the boundary under suspicion. Prefer one decisive observation over scattered speculative logging.
4. Trace incorrect data or state backward across component boundaries. Capture inputs and outputs without exposing secrets.
5. State one falsifiable hypothesis: suspected cause, supporting evidence, and a result that would disprove it.
6. Run the smallest experiment that distinguishes that hypothesis from alternatives. If the result disproves it, return to step 5 with the new evidence.

Do not mix speculative fixes into evidence gathering. A disproved hypothesis is progress.

## Fix

Once the cause is supported:

1. Add a focused regression test or executable reproduction when feasible.
2. Change the source of the fault with the smallest sufficient edit. For a symbol change, update every reference found with `grep` and confirm with the project's type checker.
3. Re-run the original reproduction and confirm the symptom no longer occurs.
4. Run the focused regression check and broader checks proportional to the affected area.
5. Remove temporary diagnostics and stop background processes you started unless they provide lasting operational value.

Load the `developing-test-first` skill when a reliable red-green cycle is feasible. Load the `verifying-before-completion` skill before reporting the bug fixed.

## Escalate

Report an evidence gap only when reproduction requires unavailable access, data, hardware, or credentials. Ask before broad architectural work or scope expansion. Report the root cause, evidence, change, verification, and remaining uncertainty.
