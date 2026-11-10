---
description: Review local changes in Hunk and apply fixes until LGTM
---

Review the complete intended local change with the `reviewing-local-changes` skill, and fix every accepted finding. Do not create or use a pull request for review.

Repeat review cycles: reload the scope, review, evaluate every new finding and open user note, then fix and validate. Each cycle's reviewers read the session's existing threads as prior-review context. Stop when a complete cycle posts no material findings, every thread in the session is settled, and no coverage gaps remain. Ask the user about any `Clarification needed:` thread instead of guessing.

Report LGTM only after a cycle meets that condition. Leave the changes local and the review threads in the Hunk session. Do not commit, push, post pull request comments, or create a pull request unless separately requested.
