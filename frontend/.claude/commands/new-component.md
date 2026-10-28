---
description: Add a reusable component
argument-hint: <what it shows>
---

The person wants a reusable component: $ARGUMENTS

1. Check `apps/web/src/components/ui` (and `apps/mobile/src/components/ui` for Expo) first:
   if an existing component already does it, use or extend that instead.
2. Create it with the generator:
   `npm run generate -- component "<Name>" <web|mobile> <ui|shared|layout> <yes|no: test>`
   (`ui` = small building block, `shared` = bigger piece used on several pages, `layout` = page frame).
3. Implement it following AGENTS.md (theme colors only, accessible markup, props with clear names and a short doc comment).
4. Use it where the person wanted it, update the test, run `npm run check`.
5. Explain in one or two plain sentences what it does and where it appears.
