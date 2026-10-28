# Desktop app

An Electron window that shows the website from `apps/web`. You don't build
screens here: change `apps/web` and the desktop app shows the change.

| Command (run from the project folder) | What it does                                                     |
| ------------------------------------- | ---------------------------------------------------------------- |
| `npm run dev:desktop`                 | Opens the app. It reloads by itself when you change a file.      |
| `npm run build:desktop`               | Makes an installer for this computer in `apps/desktop/release/`. |

- `main.cjs` opens the window. `preload.cjs` passes information to the website.
- Icons: see `build/README.md`.
- A Mac can build Mac apps, Windows builds Windows apps. Building for another
  system usually needs that system (or a CI service).
