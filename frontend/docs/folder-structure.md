# Where everything lives

```
.
├── project.config.json      Your answers from `npm run setup` (name, look, apps, data source)
├── AGENTS.md / CLAUDE.md    Rules your AI assistant follows
├── apps/
│   ├── web/                 The website (React)
│   │   └── src/
│   │       ├── app/         Start-up, list of pages (routes.tsx), providers
│   │       ├── pages/       One folder per page: pages/todos/TodosPage.tsx
│   │       ├── components/
│   │       │   ├── ui/      Building blocks: Button, Input, Card, Spinner...
│   │       │   ├── shared/  Bigger pieces used on several pages (made by the generator)
│   │       │   └── layout/  The frame: top bar, bottom tabs, theme switch
│   │       ├── providers/   App-wide things: signed-in user, light/dark theme
│   │       ├── hooks/       Reusable logic: useLocalStorage...
│   │       ├── lib/         Small helpers: platform detection, storage
│   │       ├── styles/      global.css (theme colors → Tailwind classes)
│   │       └── test/        Test helpers
│   ├── mobile/              The phone app, if you picked one
│   │   ├── (Expo)  app/     Screens: each file is a screen, app/(tabs)/ are the bottom tabs
│   │   │           src/     components/ui, providers, hooks, lib (same idea as web)
│   │   └── (Emulator)       capacitor.config.ts + scripts: wraps apps/web in a phone app
│   └── desktop/             The desktop app, if you picked one: main.cjs opens a window showing apps/web
├── packages/
│   ├── api/src/             Everything that talks to the server
│   │   ├── client.ts        Sends requests (adds the login token, handles errors)
│   │   ├── mock/            The fake server used while "api.mode" is "mock"
│   │   ├── auth/            Sign in / sign out / who am I
│   │   └── todos/ users/    One folder per kind of data:
│   │       ├── todos.types.ts   what a todo looks like
│   │       ├── todos.api.ts     the server calls
│   │       ├── todos.mock.ts    fake data + fake server answers
│   │       ├── todos.hooks.ts   useTodos(), useCreateTodo()... for pages
│   │       └── todos.test.ts    tests
│   ├── theme/               Colors, corners, fonts (from project.config.json)
│   └── config/              Gives code typed access to project.config.json
├── docker-compose.yml, docker/   Only if you said yes to Docker
├── plopfile.mjs, plop-templates/ The generators behind `npm run generate`
├── templates/               Optional apps the setup wizard copies in. Don't edit to change your app.
├── scripts/                 setup wizard, doctor, command helpers
└── docs/                    These guides
```

## Which app do I change?

| You picked           | To change the website | To change the phone app   | To change the desktop app |
| -------------------- | --------------------- | ------------------------- | ------------------------- |
| Website only         | `apps/web`            | —                         | —                         |
| Mobile: **Emulator** | `apps/web`            | `apps/web` (same screens) | `apps/web`                |
| Mobile: **Expo**     | `apps/web`            | `apps/mobile`             | `apps/web`                |
| Desktop              | `apps/web`            |                           | `apps/web` (same screens) |

Data (`packages/api`) and the look (`packages/theme`) are shared by all of them.
