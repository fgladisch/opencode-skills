---
description: Validate the work, publish it as a pull request, and address its review
---

Load the `finalizing-changes` skill and apply it to the current work to open a pull request. Report the pull request URL.

Then load the `addressing-pull-request-reviews` skill and drive the pull request through review rounds until the reviewer approves. Ignore findings the reviewer marks as optional: leave them unfixed and unanswered, and do not count them as open. Address every other finding and failing check as the skill describes.
