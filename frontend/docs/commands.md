# All commands

Type these in a terminal opened in the project folder.

## Start and stop

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `npm run dev`         | Website at http://localhost:5173. Stop with `Ctrl + C`. |
| `npm run dev:web`     | Same as above.                                          |
| `npm run dev:mobile`  | Expo phone app: shows a QR code for Expo Go.            |
| `npm run android`     | Phone app in the Android Emulator (Expo or Capacitor).  |
| `npm run ios`         | Phone app in the iPhone Simulator (Mac only).           |
| `npm run dev:desktop` | Desktop app window (reloads when you save).             |

## Create things

| Command                      | What it does                                           |
| ---------------------------- | ------------------------------------------------------ |
| `npm run generate`           | Menu: page, component, api, hook.                      |
| `npm run generate page`      | A page / screen, added to the menu if you like.        |
| `npm run generate component` | A reusable piece of screen.                            |
| `npm run generate api`       | A kind of data: server calls, fake data, hooks, tests. |
| `npm run generate hook`      | Reusable logic.                                        |

## Check

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run check`     | Looks for mistakes (typecheck) and runs all tests. |
| `npm test`          | Tests only.                                        |
| `npm run typecheck` | Mistake check only.                                |
| `npm run doctor`    | Checks your computer has what the apps need.       |
| `npm run format`    | Tidies the formatting of every file.               |

## Build for real

| Command                 | What it does                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`         | The finished website in `apps/web/dist` (upload it to any static host: Netlify, Vercel, Cloudflare Pages...).                                        |
| `npm run build:desktop` | An installer for this computer in `apps/desktop/release/`.                                                                                           |
| `npm run build:android` | Emulator apps: an `.apk` file. Add `-- --docker` to build it in Docker without Android Studio. Expo apps: prints how to build in the cloud with EAS. |

## Docker (if you said yes during setup)

| Command               | What it does                                                   |
| --------------------- | -------------------------------------------------------------- |
| `npm run docker:dev`  | Website in Docker at http://localhost:5173 with live reload.   |
| `npm run docker:prod` | The finished website served by nginx at http://localhost:8080. |
| `npm run docker:down` | Stops the Docker containers.                                   |

## Change your setup

| Command                  | What it does                                                                      |
| ------------------------ | --------------------------------------------------------------------------------- |
| `npm run setup`          | Re-run the wizard: add a mobile/desktop app, change the look, switch data source. |
| `npm run setup -- --yes` | Re-apply `project.config.json` without questions.                                 |
