# When something goes wrong

Start with `npm run doctor`: it checks the usual suspects and says how to fix them.
If that doesn't help, paste the full error to your AI assistant along with the
command you ran.

## "command not found: npm" or "node"

Node.js isn't installed (or the terminal was open before you installed it).
Install the LTS version from https://nodejs.org, then close and reopen the terminal.

## "Port 5173 is already in use"

The app is already running in another terminal. Use that one, or stop it with
`Ctrl + C` there. Still stuck? Restart your computer.

## The page is blank

Open the browser's developer tools (`F12` or right-click → Inspect) → Console tab,
copy the red error and paste it to your AI assistant.

## "Cannot find module" / weird errors after pulling changes

Packages are out of date. Run `npm install`. If that fails, delete the
`node_modules` folder and run `npm install` again.

## Expo Go can't connect / QR code does nothing

- Phone and computer must be on the **same Wi-Fi** (not a guest network).
- Try `npx expo start --tunnel` inside `apps/mobile` (works across networks, slower).
- Update Expo Go from the app store: it only runs the newest Expo version.

## Android emulator: "No emulator found" / app doesn't open

Open Android Studio → _Device Manager_ → create a virtual device and start it, then
run `npm run android` again. Check with `npm run doctor`.

## iPhone Simulator doesn't open

Needs a Mac with Xcode. Open Xcode once so it finishes installing components, then run
`sudo xcode-select -s /Applications/Xcode.app`.

## My backend data doesn't show up

- Check `project.config.json` → `"api": { "mode": "remote", "baseUrl": "..." }`.
- The backend must allow requests from `http://localhost:5173` (ask whoever runs it to add it to CORS).
- On the Android emulator "localhost" means the phone: the app swaps it for `10.0.2.2` automatically.
- On a real phone with Expo, "localhost" is replaced by your computer's address automatically, but the backend must listen on your network (not only on 127.0.0.1).

## Desktop app: "Electron failed to install correctly"

Run `npm run dev:desktop` again (it repairs the download), or delete
`node_modules/electron` and run `npm install`.

## Docker: "Cannot connect to the Docker daemon"

Start Docker Desktop and wait until it says it's running.

## I broke everything and want to go back

If you use git: `git status` shows what changed, and your AI assistant can undo
specific changes for you. Ask: _"undo the changes you made to the Recipes page"_.
