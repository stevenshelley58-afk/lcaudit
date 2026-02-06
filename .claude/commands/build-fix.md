---
description: Fix build errors from Vercel deployment. Minimal diffs only.
---

Invoke the **build-error-resolver** agent.

1. Check Vercel deployment logs for errors
2. Parse and group errors by file
3. For each error:
   - Show error context
   - Apply minimal fix
   - Push to GitHub
   - Verify Vercel preview deploys successfully
4. Stop if fix introduces new errors or same error persists after 3 attempts
5. Show summary: errors fixed, errors remaining

NEVER run builds locally. Always verify on Vercel.
