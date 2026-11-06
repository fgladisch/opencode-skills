---
description: Address review feedback on an open PR until LGTM
---

Use the pull request given in the arguments, otherwise the open pull request for the current branch. If none exists, stop and say so; do not create one. Wait for the complete review comment. Evaluate every finding, apply every accepted fix, and mark each addressed finding as resolved in the pull request. Post a pull request comment summarizing how you addressed the feedback, including the rationale for any finding you did not accept. After posting the comment, commit all resulting changes and push the branch. Repeat the review, fix, resolve, comment, commit, and push cycle until the review reports LGTM.
