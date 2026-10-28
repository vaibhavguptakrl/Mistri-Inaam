---
description: Switch from fake data to a real backend
argument-hint: <backend URL>
---

Connect the app to the real backend: $ARGUMENTS

1. In `project.config.json` set `"api": { "mode": "remote", "baseUrl": "<url>" }`
   (the base URL includes any prefix such as `/api/v1`).
2. For each folder in `packages/api/src/` (except `mock/`), compare the paths and response
   shapes in `*.api.ts` with the backend. Adapt `*.api.ts` (not the pages) where they differ.
   Ask the person for the backend's API docs if you can't find them.
3. Remind the person the backend must allow requests from http://localhost:5173 (CORS)
   and, for the Android emulator, that "localhost" becomes 10.0.2.2 automatically.
4. Start `npm run dev`, sign in, and check each page loads. Report anything that still fails, in plain words.
5. To go back to fake data any time: set `"mode": "mock"`.
