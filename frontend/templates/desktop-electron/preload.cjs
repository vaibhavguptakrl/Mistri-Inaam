// Runs inside the window before the website loads. Whatever is put on
// `window.desktop` here can be read by apps/web (see apps/web/src/lib/platform.ts).
// Keep this small: only expose what the website really needs.
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  os: process.platform,
  version: process.versions.electron
})
