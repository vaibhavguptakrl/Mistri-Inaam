# Mobile app (Expo)

The iPhone and Android app, built with [Expo](https://expo.dev) and React Native.
Its screens are separate from the website's (they use phone building blocks like
`<View>` and `<Text>` instead of `<div>`), but they share the same data (`@app/api`)
and colors (`@app/theme`).

## Try it on your phone (easiest)

1. Install **Expo Go** from the App Store or Google Play.
2. From the project folder run `npm run dev:mobile`.
3. Scan the QR code: with the Camera app on iPhone, or from inside Expo Go on Android.
   Your phone and computer must be on the same Wi-Fi.

It reloads by itself whenever you save a file.

## Where things are

| Folder               | What's in it                                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| `app/`               | Screens. Each file is a screen; `app/(tabs)/` are the tabs at the bottom.               |
| `app/_layout.tsx`    | The frame around every screen.                                                          |
| `src/components/ui/` | Buttons, cards, inputs... Use these instead of raw `View`/`Text` for a consistent look. |
| `src/providers/`     | Theme (light/dark) and the signed-in user.                                              |
| `app.json`           | App name, app id and icons.                                                             |

Add a screen: `npm run generate page` and pick "mobile".
