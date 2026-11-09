---
description: Address review feedback on an open PR until LGTM
---

Load the `addressing-pull-request-reviews` skill and run its review rounds on the current pull request until the review reports LGTM. Wait only with the skill's script. Evaluate every finding, apply every accepted fix, and reply to each finding the way the reviewer reads replies, including the rationale for any finding you did not accept. Post a pull request comment summarizing how you addressed the feedback. Commit all resulting changes with the `committing-changes` skill, then push the branch.
