// The desktop app's "main process": it opens the window and loads the website
// from apps/web into it. Screens are built in apps/web, not here.
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { app, BrowserWindow, net, protocol, shell } = require('electron')

const isDev = process.argv.includes('--dev')
const DEV_URL = 'http://localhost:5173'

// The built website: inside the installed app, or apps/web/dist while developing.
const webRoot = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'web', 'dist')

// Serve the built website from app://local/... so page addresses like /users/3 work.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

function serveWebsite() {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url)
    const file = path.join(webRoot, decodeURIComponent(pathname))
    // Never serve files outside the website folder.
    const inside = file.startsWith(webRoot + path.sep)
    const response = inside ? await net.fetch(pathToFileURL(file).toString()).catch(() => null) : null
    // Any page address that isn't a file gets index.html, and the app's router takes over.
    return response && response.ok ? response : net.fetch(pathToFileURL(path.join(webRoot, 'index.html')).toString())
  })
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 360,
    minHeight: 500,
    title: '__APP_NAME__',
    backgroundColor: '#0b0f17',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.once('ready-to-show', () => window.show())

  // Links to other websites open in the normal browser, not inside the app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    window.loadURL(DEV_URL)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadURL('app://local/')
  }
}

app.whenReady().then(() => {
  serveWebsite()
  createWindow()
  // macOS: clicking the dock icon with no windows open makes a new one.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
