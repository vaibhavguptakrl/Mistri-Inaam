---
description: Add a new page or screen
argument-hint: <what the page is for>
---

The person wants a new page: $ARGUMENTS

1. Read `project.config.json` to see which apps exist (web, Expo mobile, or both).
2. If it isn't clear what the page should show or who may see it, ask one short question in plain words.
3. Create it with the generator (never by hand), once per app that needs it:
   `npm run generate -- page "<Name>" <web|mobile> <yes|no: in menu> <yes|no: login required>`
4. Fill the generated file in, following AGENTS.md: components from `@/components/ui`,
   data through hooks from `@app/api` (generate an API first with `/new-api` if the data doesn't exist yet),
   loading / error / empty states, theme colors only.
5. Update the generated test so it checks what the person will see.
6. Run `npm run check` and fix anything it reports.
7. Tell the person, in plain words, where to see it (e.g. http://localhost:5173/<path>, or the new tab in Expo Go).
