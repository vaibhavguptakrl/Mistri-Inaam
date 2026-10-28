---
description: Fix an error the person ran into
argument-hint: <paste the error and the command that caused it>
---

The person hit this error: $ARGUMENTS

1. If they didn't say which command or page caused it, ask once.
2. Run `npm run doctor` if it looks like a setup problem (missing tool, emulator, Docker).
3. Find the real cause (read the files involved, reproduce with the same command). Don't guess.
4. Fix the cause, not the symptom: no `@ts-ignore`, no deleting tests, no turning checks off.
5. Run `npm run check` (and the command that failed) to confirm it's fixed.
6. Explain in two or three plain sentences what was wrong and what you changed.
