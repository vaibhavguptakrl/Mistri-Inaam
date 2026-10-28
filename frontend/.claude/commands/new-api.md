---
description: Add a new kind of data (API + fake data + hooks)
argument-hint: <kind of data, e.g. recipes with title, minutes, vegetarian>
---

The person needs a new kind of data: $ARGUMENTS

1. Work out the fields and their types (string, number, boolean, date). If they are unclear,
   suggest a sensible list in plain words and go ahead unless the person objects.
2. Generate it:
   `npm run generate -- api <plural-name> "<field:type,...>" "<list,get,create,update,delete>"`
   (only the operations the app needs).
3. Make the fake rows in `packages/api/src/<name>/<name>.mock.ts` realistic for their app.
4. If `api.mode` in `project.config.json` is `"remote"`, check the paths in `<name>.api.ts`
   match the real backend, and adapt the response shape there if needed.
5. Run `npm run check`, then tell the person which hooks pages can use (e.g. `useRecipes()`).
