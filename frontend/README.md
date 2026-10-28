# Frontend Boilerplate

One project that becomes a **website**, a **mobile app** (iPhone + Android) and a
**desktop app** (Mac, Windows, Linux), made for building with an AI assistant.
You describe what you want; the AI follows the rules in this project to build it
the same, tidy way every time.

You don't need to know how to code. You need to be able to copy commands into a
terminal and describe what you want in plain words.

---

## Start here (10 minutes)

**1. Install Node.js** (the engine that runs everything) from <https://nodejs.org>.
Pick the **LTS** button. Check it worked by opening a terminal and typing:

```bash
node --version
```

You should see a number like `v22.x`. Any number 20 or higher is fine.

**2. Open this folder in a terminal.** In VS Code or Cursor: _Terminal → New Terminal_.

**3. Run the setup wizard.** It asks your app's name, then offers **Quick setup**:

```bash
npm run setup
```

Not sure? Press Enter at every question. Quick setup only asks what you're
building (a website, a mobile app, or both) and picks safe choices for the rest:
fake data built in, a mobile app you test on your own phone with the free
_Expo Go_ app, and nothing extra to install. Choose **Custom** instead to pick
the colors, a phone emulator, a desktop app or Docker yourself.

**4. Start your app:**

```bash
npm run dev
```

Open <http://localhost:5173> in your browser. That's your app. Leave the terminal
running; the page updates by itself whenever a file changes. Press `Ctrl + C` in
the terminal to stop it.

**5. Start building.** Open this folder in your AI assistant (Claude Code, Cursor,
Copilot...) and say what you want, for example:

> Add a page called "Recipes" that shows a list of recipes with a photo, a title
> and a cooking time. Use fake data for now.

See [docs/prompting-guide.md](docs/prompting-guide.md) for more examples.

---

## Everyday commands

| Type this                         | What happens                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`                     | Opens the website at http://localhost:5173                                       |
| `npm run dev:mobile`              | Shows a QR code: scan it with **Expo Go** on your phone (Expo mobile apps)       |
| `npm run android` / `npm run ios` | Opens the app in the Android Emulator / iPhone Simulator (emulator mobile apps)  |
| `npm run dev:desktop`             | Opens the desktop app                                                            |
| `npm run generate`                | Creates a new page, component, API or hook the right way                         |
| `npm run check`                   | Checks for mistakes and runs the tests                                           |
| `npm run doctor`                  | Checks your computer has everything it needs, and says how to fix what's missing |
| `npm run setup`                   | Change your answers (add mobile, switch colors, ...)                             |
| `npm run build`                   | Makes the finished website, ready to put online (in `apps/web/dist`)             |
| `npm run docker:dev`              | Runs the website inside Docker (if you said yes to Docker)                       |

All commands: [docs/commands.md](docs/commands.md).

## What the setup questions mean

| Question                                | In plain words                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Quick or Custom?**                    | **Quick** asks one more question (website, mobile app or both) and picks the beginner-friendly answer for everything below. **Custom** asks them all.                                                                                                                                            |
| **Where should your app run?**          | Website, phone app, computer app, or any mix.                                                                                                                                                                                                                                                    |
| **Expo or Emulator?** (mobile only)     | **Expo**: test on your real phone with the free _Expo Go_ app; nothing else to install. The phone screens are written separately from the website. **Emulator**: the phone app _is_ your website wrapped in an app, so you build screens once. Testing needs Android Studio (or Xcode on a Mac). |
| **App ID**                              | A unique name app stores use, like `com.yourname.recipes`. Only matters when you publish.                                                                                                                                                                                                        |
| **Light or dark, color, corners, font** | The look. Change it any time in `project.config.json`.                                                                                                                                                                                                                                           |
| **Where does data come from?**          | **Fake data** works straight away with no server. Switch to **your backend** when you have one.                                                                                                                                                                                                  |
| **Docker?**                             | A way to run the app in a sealed box. Only say yes if you use Docker already.                                                                                                                                                                                                                    |
| **Keep the examples?**                  | A todo list and a users list that show how everything fits together. Great for learning, and your AI will copy their patterns.                                                                                                                                                                   |

## How the project is organised

```
apps/
  web/          the website (also shown inside the emulator phone app and the desktop app)
  mobile/       the phone app (only if you picked mobile)
  desktop/      the desktop app (only if you picked desktop)
packages/
  api/          everything that talks to the server, plus the fake data
  theme/        colors, corners, fonts
  config/       reads project.config.json
docs/           guides (start with prompting-guide.md)
project.config.json   your answers from the setup wizard
```

The full tour: [docs/folder-structure.md](docs/folder-structure.md).

## When something goes wrong

1. Run `npm run doctor` and follow what it says.
2. Look in [docs/troubleshooting.md](docs/troubleshooting.md).
3. Copy the **whole** error message and paste it to your AI assistant with
   "I got this error when I ran `<the command>`. Please fix it."

## For AI assistants

Project rules live in [AGENTS.md](AGENTS.md) (read automatically by Claude Code via
`CLAUDE.md`, by Cursor, Copilot and others).
