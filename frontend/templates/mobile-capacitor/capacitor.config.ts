import type { CapacitorConfig } from '@capacitor/cli'

// Debug builds may call a backend on this computer over plain http
// (the Android emulator reaches it as 10.0.2.2, the iOS Simulator as localhost).
// Set RELEASE=1 for store builds, which only allow https.
const release = process.env.RELEASE === '1'

const config: CapacitorConfig = {
  appId: '__APP_ID__',
  appName: '__APP_NAME__',
  // The built website the app shows. `npm run android` builds it first.
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
    cleartext: !release
  },
  android: {
    allowMixedContent: !release
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      showSpinner: false
    }
  }
}

export default config
