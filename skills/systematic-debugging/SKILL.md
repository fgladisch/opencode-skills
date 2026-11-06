---
name: systematic-debugging
description: Use when a bug, failing test, build failure, performance regression, or other unexpected behavior needs diagnosis before a fix is proposed.
metadata:
  opencode/autoinvoke: true
---

# Systematic Debugging

Find evidence for the failure mechanism before changing production behavior. Observe the real state through OpenCode's tools instead of guessing.

## Reproduce

1. Read the complete error, logs, stack trace, and relevant configuration with `read`.
2. Reproduce the symptom with the smallest reliable command or interaction. Use `shell` for finite commands and `shell` with `background: true` for services, watchers, or other long-running processes; redirect their output to a log file so you can `read` it later.
3. For UI failures, drive the exact path with the `browser` namespace through `execute` when it is available, or with the project's browser automation through `shell`, and record the observed state.
4. If the failure is intermittent, record conditions and frequency rather than treating one pass as proof.

## Diagnose

1. Inspect recent changes, environment differences, and nearby working examples.
2. Trace definitions, implementations, types, and references with `grep` on word-bounded symbol names and targeted `read` calls. Confirm a symbolic relationship by reading the import or declaration, not only a textual match.
3. When the state cannot be observed from output, use the runtime's non-interactive inspection through `shell`, such as a scripted debugger run, a stack dump, or one targeted temporary log line at the boundary under suspicion. Prefer one decisive observation over scattered speculative logging.
4. Trace incorrect data or state backward across component boundaries. Capture inputs and outputs without exposing secrets.
5. State one falsifiable hypothesis: suspected cause, supporting evidence, and a result that would disprove it.
6. Run the smallest experiment that distinguishes that hypothesis from alternatives.

Do not mix speculative fixes into evidence gathering. A disproved hypothesis is progress; update it from the new evidence.

## Fix

Once the cause is supported:

1. Add a focused regression test or executable reproduction when feasible.
2. Change the source of the fault with the smallest sufficient `edit`. For a symbol change, update every reference found with `grep` and confirm with the project's type checker.
3. Re-run the original reproduction and confirm the symptom no longer occurs.
4. Run the focused regression check and broader checks proportional to the affected area.
5. Remove temporary diagnostics and stop background processes you started unless they provide lasting operational value.

Load the `test-driven-development` skill when a reliable red-green cycle is feasible. Load the `verification-before-completion` skill before reporting the bug fixed.

## Escalate

Report an evidence gap only when reproduction requires unavailable access, data, hardware, or credentials. Ask before broad architectural work or scope expansion. Report the root cause, evidence, change, verification, and remaining uncertainty.
