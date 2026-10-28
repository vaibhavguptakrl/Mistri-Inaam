# Rules for AI assistants

This file is the source of truth for how code in this project is written. Read it
before creating or changing anything. The person you are working with is usually
**not a programmer**: they describe what they want in plain words and rely on you
to keep the project tidy, working and consistent.

## How to work with the person

- Explain what you did in plain words, without jargon. Say what to open or click
  to see the result (e.g. "open http://localhost:5173/recipes").
- Don't ask them technical questions they can't answer ("Zustand or Context?").
  Pick the option these rules point to and mention it in one line.
- Do ask about **what they want** when it's unclear (what fields a recipe has,
  who may see a page).
- After every change, run `npm run check` and fix what it reports before saying
  you're done. If something can't be verified (e.g. on a real phone), say so.
- Never delete their work or reset files without asking first.

## Read the setup first

`project.config.json` says what this project contains:

- `targets.web / mobile / desktop`: which apps exist.
- `mobile.type`: `"expo"` = a separate React Native app in `apps/mobile` with its
  own screens; `"emulator"` = Capacitor, which shows the **website** inside a phone
  app (so phone screens are built in `apps/web`); `"none"` = no mobile app.
- `api.mode`: `"mock"` = fake data from `packages/api/src/**/*.mock.ts`;
  `"remote"` = the real backend at `api.baseUrl`.
- `theme`: colors, corners, font. Changing these here restyles every app.

To add or remove an app, run the wizard (`npm run setup`, or
`npm run setup -- --answers '<json>' [--force]` without a keyboard; see
`scripts/setup.mjs`). Never copy `templates/` by hand. `npm run doctor -- --json`
reports what this computer is missing as JSON.

## Architecture (don't deviate)

```
apps/web        React 19 + Vite + Tailwind CSS 4 + React Router 7   (website, Capacitor app, Electron app)
apps/mobile     Expo + expo-router + React Native                   (only when mobile.type = "expo")
                or Capacitor shell around apps/web                  (when mobile.type = "emulator")
apps/desktop    Electron shell around apps/web
packages/api    every server call, fake data, and React Query hooks  → import from '@app/api'
packages/theme  colors / radius / fonts from project.config.json     → import from '@app/theme'
packages/config typed project.config.json                            → import from '@app/config'
```

Data always flows: **page → hook from `@app/api` → `*.api.ts` → `http` client →
server (or `*.mock.ts` when fake data is on)**.

- Pages and components never call `fetch` directly. They use the hooks from
  `@app/api` (`useTodos()`, `useCreateTodo()`...). Need new data? Generate an API
  (below), don't hand-roll it.
- Server state lives in React Query (through those hooks). Don't copy it into
  `useState`. Use `useState` for what's on screen only (form inputs, open/closed).
- App-wide state: React context in `apps/web/src/providers/` (see `AuthProvider`,
  `ThemeProvider`). Don't add a state library unless the person asks.
- The signed-in user: `useAuth()` from `@/providers/AuthProvider`. Pages that need
  a login set `requiresLogin: true` in `apps/web/src/app/routes.tsx`.

## Use the generators

They create files in the right place, in the right shape, and wire them in.
Always prefer them over writing these files by hand. Without a keyboard, pass the
answers in order (use `_` for the default):

| Need            | Command                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------- |
| A page / screen | `npm run generate -- page "<Name>" <web\|mobile> <inNav yes\|no> <requiresLogin yes\|no>`      |
| A component     | `npm run generate -- component "<Name>" <web\|mobile> <ui\|shared\|layout> <withTest yes\|no>` |
| A kind of data  | `npm run generate -- api <plural-name> "<field:type,...>" "<list,get,create,update,delete>"`   |
| A hook          | `npm run generate -- hook <name> <web\|mobile>`                                                |

Field types: `string`, `number`, `boolean`, `date`. Examples:

```bash
npm run generate -- page "Order History" web yes yes
npm run generate -- component "Price Tag" web ui yes
npm run generate -- api recipes "title:string,minutes:number,vegetarian:boolean" "list,get,create,update,delete"
```

`web` is the website **and** the emulator phone app **and** the desktop app.
`mobile` is only valid when `mobile.type` is `"expo"`. When the person wants a
feature "in the app" and both exist, build it for both.

Generator definitions live in `plopfile.mjs`, templates in `plop-templates/`. If
a new repeating pattern appears, extend them there.

## Conventions

- **TypeScript everywhere** (`.ts` / `.tsx`), `strict` on. No `any` unless there
  is truly no type; prefer the types exported from `@app/api`.
- **Imports**: inside `apps/web` and `apps/mobile`, use `@/…` for anything outside
  the current folder (`import { Button } from '@/components/ui'`). Shared code
  comes from `@app/api`, `@app/theme`, `@app/config`. Never `../../..`.
- **Naming**: components and pages `PascalCase` (`OrderHistoryPage.tsx`,
  `PriceTag.tsx`), hooks `useSomething.ts`, folders `kebab-case` for pages
  (`pages/order-history/`), API folders plural kebab (`packages/api/src/blog-posts/`).
- **One component per file**, exported by name (no default exports in `apps/web`;
  Expo screens in `apps/mobile/app/` must be default exports, that's how
  expo-router finds them).
- **Styling (web)**: Tailwind classes using the theme names, never fixed colors:
  `bg-surface`, `bg-surface-muted`, `bg-background`, `border-border`, `text-text`,
  `text-text-muted`, `bg-primary text-on-primary`, `text-danger`, `text-success`,
  `text-warning`, `rounded-sm|md|lg`. Combine classes with `cn()` from `@/lib/cn`.
  Light/dark mode then works by itself. No `bg-white`, `text-gray-900`, hex codes
  or inline `style={{ color }}`.
- **Styling (Expo)**: `StyleSheet.create` for layout, and colors from
  `useTheme()` (`colors.primary`, `colors.text`, `radius.md`...). Never hard-code colors.
- **Build from the UI kit**: `apps/web/src/components/ui` (Button, Input, Card,
  PageHeader, Spinner, EmptyState, ErrorMessage, Avatar, Badge) and
  `apps/mobile/src/components/ui` (Screen, Button, Input, Card, Text, ...). Reuse
  these before making new ones.
- **Every screen that loads data shows three states**: loading (`<Spinner />`),
  error (`<ErrorMessage error={query.error} onRetry={() => query.refetch()} />`)
  and empty (`<EmptyState />`). Copy `pages/todos/TodosPage.tsx`.
- **Forms**: `<Input label=… error=…>`, disable the submit button while saving
  (`loading={mutation.isPending}`), show server errors with `errorMessage(error)`.
- **Accessibility**: real `<button>`s and `<a>`/`<Link>`s, labels on every input,
  `alt` on images, `aria-label` on icon-only buttons.
- **Platform checks (web)**: `platform`, `isMobileApp`, `isDesktopApp` from
  `@/lib/platform`. Don't import Capacitor or Electron in `apps/web`.
- **Secrets**: never put API keys or passwords in the frontend. Anything in
  `VITE_*` / `EXPO_PUBLIC_*` env vars or in the code is readable by every user.
- **Don't add dependencies casually.** If one is truly needed, install it in the
  right workspace (`npm install <pkg> --workspace @app/web`), pin the exact
  version, and tell the person why. For Expo use `npx expo install <pkg>` inside
  `apps/mobile` so the version matches the Expo SDK.

## Backend and fake data

- Fake data (`api.mode: "mock"`): each `packages/api/src/<thing>/<thing>.mock.ts`
  registers fake endpoints with `mock('GET', '/path', handler)`. They must use the
  same paths as the real server. Throw `mockError(status, message)` for errors.
- Real backend: set `api.mode` to `"remote"` and `api.baseUrl`, or override per
  machine with `apps/web/.env.local` (`VITE_API_URL`, `VITE_USE_MOCKS`) /
  `apps/mobile/.env` (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_USE_MOCKS`).
- The `http` client accepts plain JSON or the `{ data, errors }` envelope used by
  the companion backend boilerplate, sends `Authorization: Bearer <token>`, and
  signs the user out on a 401.
- When the backend answers with a different shape, adapt it inside `*.api.ts`, so
  pages never change.

## Testing

- `npm run check` = typecheck + tests for every app. Run it before saying a task is done.
- Web tests: Vitest + Testing Library, next to the file (`Button.test.tsx`). Use
  `renderWithProviders` from `@/test/render` for anything that uses data, the
  router or the signed-in user. API tests live next to each API
  (`todos.test.ts`) and run against the fake data.
- Test what the person would see or do ("shows the title", "adds a todo"), not
  implementation details.

## Don't

- Don't edit `templates/` to change _this_ project's apps (that's the source for
  `npm run setup`); edit `apps/` instead.
- Don't remove the `// plop:…` and `{/* plop:… */}` marker comments: generators
  insert code above them. `demo:start` / `demo:end` mark example code the setup
  wizard can remove.
- Don't commit `.env` files, `apps/mobile/android`, `apps/mobile/ios` (generated).
- Don't change `apps/desktop/main.cjs` security settings (`contextIsolation`,
  `sandbox`, `nodeIntegration`).
