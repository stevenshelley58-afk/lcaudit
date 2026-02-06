---
description: Review uncommitted changes for security and quality issues.
---

Invoke the **code-reviewer** agent.

1. Get changed files: `git diff --name-only HEAD`
2. Review each file against project rules (see .claude/rules/)
3. Check for lcaudit-specific issues:
   - Evidence-based findings
   - Native structured output usage
   - Correct model routing
   - Australian English
4. Generate report with severity, file location, and suggested fixes
5. Block if CRITICAL or HIGH issues found
