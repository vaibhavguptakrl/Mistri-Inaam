# Website (apps/web)

React + Vite + Tailwind CSS. It is also what the **emulator** phone app and the
**desktop** app show, so changing it changes them too.

| Where                    | What                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `src/app/routes.tsx`     | Every page and its address. `npm run generate page` adds to it.             |
| `src/pages/<name>/`      | One folder per page.                                                        |
| `src/components/ui/`     | Building blocks: Button, Input, Card, Spinner, PageHeader...                |
| `src/components/layout/` | The frame around every page (top bar, bottom tabs).                         |
| `src/providers/`         | The signed-in user (`useAuth`) and light/dark theme (`useTheme`).           |
| `src/styles/global.css`  | Turns the theme into Tailwind classes (`bg-primary`, `text-text-muted`...). |
| `.env.example`           | Copy to `.env.local` to point at a different backend while developing.      |

Run it from the project folder with `npm run dev`. Tests: `npm test`.
