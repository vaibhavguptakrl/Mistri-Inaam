// src/realm.ts
import * as Realm from "realm-web";

// Replace with your Stitch/Realm App ID
const APP_ID = "your-app-id"; // <-- TODO: set your Stitch App ID

export const app = new Realm.App({ id: APP_ID });

/**
 * Helper to get a logged‑in user. If no user is logged in, it logs in anonymously.
 */
export async function getUser() {
  if (!app.currentUser) {
    await app.logIn(Realm.Credentials.anonymous());
  }
  return app.currentUser;
}

/** Simple wrapper for calling Realm Functions */
export async function callFunction(name: string, ...args: any[]) {
  const user = await getUser();
  return user.functions[name](...args);
}
