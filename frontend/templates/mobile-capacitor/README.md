# Mobile app (Capacitor)

The iPhone and Android apps show the website from `apps/web` inside a real
app. You don't build screens here: change `apps/web` and the app shows the change
the next time you run it.

| Command (run from the project folder) | What it does                                                              |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `npm run android`                     | Builds and opens the app in the Android Emulator (or a plugged-in phone). |
| `npm run ios`                         | Builds and opens the app in the iPhone Simulator (Mac only).              |
| `npm run build:android`               | Makes an installable `.apk` file.                                         |

## What you need installed

- **Android:** [Android Studio](https://developer.android.com/studio). Open it once,
  then in _Device Manager_ create a virtual phone. Java comes with Android Studio.
- **iPhone:** a Mac with [Xcode](https://apps.apple.com/app/xcode/id497799835) from the App Store.
  Open Xcode once so it finishes installing.

Run `npm run doctor` to check.

## Good to know

- The `android/` and `ios/` folders are created the first time you run the app.
  They are not saved in git; delete them to start fresh.
- On the Android emulator, "localhost" means the phone itself. The app swaps it
  for `10.0.2.2` (your computer) automatically, so a backend on your computer works.
- App name and id come from `capacitor.config.ts`.
