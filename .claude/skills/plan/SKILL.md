---
name: plan
description: Create implementation plan for a feature. WAIT for user CONFIRM before writing code.
disable-model-invocation: true
---

Invoke the **planner** agent to create a comprehensive implementation plan.

1. Restate requirements clearly
2. Break down into phases with specific file paths
3. Identify dependencies and risks
4. Present plan and WAIT for explicit confirmation

Never write code until the user says "yes", "proceed", or similar.

After planning, use `/build-fix` if Vercel deploy fails, `/code-review` to review completed work.
