// The setup wizard: `npm run setup`.
// Asks a few plain-English questions, then adds only the apps you picked
// (website, mobile, desktop, Docker) and saves your answers in project.config.json.
//
// For AI assistants and scripts (no questions asked):
//   npm run setup -- --yes                       use the defaults / current answers
//   npm run setup -- --answers answers.json      or pass the answers as JSON text
//   add --force to allow deleting an app you no longer picked, --no-install to skip npm install
import * as p from '@clack/prompts'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  CONFIG_FILE,
  ROOT,
  defaultAppId,
  formatFiles,
  fromRoot,
  installedApps,
  isMac,
  isValidAppId,
  readConfig,
  readJson,
  slugify,
  writeJson
} from './lib/project.mjs'

const BRANDS = {
  indigo: '#4f46e5',
  emerald: '#059669',
  rose: '#e11d48',
  amber: '#d97706',
  sky: '#0284c7',
  violet: '#7c3aed',
  slate: '#334155'
}

const swatch = (hex) => {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16))
  return `\x1b[38;2;${r};${g};${b}m●\x1b[0m`
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const nonInteractive = flag('--yes') || flag('-y') || option('--answers') !== undefined
const force = flag('--force')
const skipInstall = flag('--no-install')

function answersFromFlag() {
  const value = option('--answers')
  if (!value) return {}
  const text = existsSync(path.resolve(value)) ? readFileSync(path.resolve(value), 'utf8') : value
  try {
    return JSON.parse(text)
  } catch {
    fail(`--answers must be JSON or a path to a JSON file. Got: ${value}`)
  }
}

function fail(message) {
  p.cancel(message)
  process.exit(1)
}

const stopIfCancelled = (value) => {
  if (p.isCancel(value)) fail('Setup cancelled. Nothing was changed. Run "npm run setup" again whenever you like.')
  return value
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

async function askQuestions(current) {
  const name =
    stopIfCancelled(
      await p.text({
        message: 'What is your app called? (press Enter to keep the grey name)',
        // A placeholder, not an initialValue: typing replaces it instead of appending to it.
        placeholder: current.name,
        defaultValue: current.name
      })
    ).trim() || current.name

  const setupMode = stopIfCancelled(
    await p.select({
      message: 'How do you want to set up?',
      options: [
        {
          value: 'quick',
          label: 'Quick setup (recommended)',
          hint: 'we pick the best options for you. Nothing extra to install.'
        },
        { value: 'custom', label: 'Custom', hint: 'choose the look, mobile emulators, desktop app, Docker, ...' }
      ],
      // A second run is usually to change something specific.
      initialValue: current.setupComplete ? 'custom' : 'quick'
    })
  )
  if (setupMode === 'quick') return quickAnswers(name, current)

  const targetList = stopIfCancelled(
    await p.multiselect({
      message: 'Where should your app run? (space to tick, enter to continue)',
      options: [
        { value: 'web', label: 'Website', hint: 'opens in any browser' },
        { value: 'mobile', label: 'Mobile app', hint: 'iPhone and Android' },
        { value: 'desktop', label: 'Desktop app', hint: 'Mac, Windows and Linux' }
      ],
      initialValues: Object.entries(current.targets)
        .filter(([, on]) => on)
        .map(([target]) => target),
      required: true
    })
  )
  const targets = {
    web: targetList.includes('web'),
    mobile: targetList.includes('mobile'),
    desktop: targetList.includes('desktop')
  }

  let mobile = { type: 'none', platforms: [] }
  if (targets.mobile) {
    const type = stopIfCancelled(
      await p.select({
        message: 'How do you want to build and test the mobile app?',
        options: [
          {
            value: 'expo',
            label: 'Expo, on your own phone (easiest)',
            hint: 'install the free "Expo Go" app and scan a QR code. Nothing else to install.'
          },
          {
            value: 'emulator',
            label: 'Emulator, a phone simulated on your computer',
            hint: "reuses the website's screens. Needs Android Studio, or Xcode on a Mac."
          }
        ],
        initialValue: current.mobile.type === 'none' ? 'expo' : current.mobile.type
      })
    )
    mobile = { type, platforms: ['android', 'ios'] }
    if (type === 'emulator') {
      mobile.platforms = stopIfCancelled(
        await p.multiselect({
          message: 'Which phones?',
          options: [
            { value: 'android', label: 'Android', hint: 'needs Android Studio' },
            { value: 'ios', label: 'iPhone', hint: isMac ? 'needs Xcode' : 'only possible on a Mac with Xcode' }
          ],
          initialValues: current.mobile.platforms.length
            ? current.mobile.platforms
            : isMac
              ? ['android', 'ios']
              : ['android'],
          required: true
        })
      )
    }
    if (type === 'expo' && !targets.web && targets.desktop) {
      p.note(
        "The desktop app shows the website's screens, so the website code stays in the project too.",
        'Good to know'
      )
    }
  }

  let appId = current.appId
  if (targets.mobile || targets.desktop) {
    const suggested = current.setupComplete ? current.appId : defaultAppId(name)
    appId = stopIfCancelled(
      await p.text({
        message: 'App ID (a unique name app stores use; leave it if unsure)',
        placeholder: suggested,
        initialValue: suggested,
        validate: (value) =>
          isValidAppId(value.trim()) ? undefined : 'Use the form com.yourname.appname: letters, numbers and dots'
      })
    ).trim()
  }

  p.log.step('Now the look of your app. You can change any of this later in project.config.json.')

  const mode = stopIfCancelled(
    await p.select({
      message: 'Light or dark?',
      options: [
        {
          value: 'system',
          label: 'Follow the device',
          hint: 'light by day, dark at night if the phone/computer is set that way'
        },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' }
      ],
      initialValue: current.theme.mode
    })
  )

  const brand = stopIfCancelled(
    await p.select({
      message: 'Main color (buttons, links, highlights)',
      options: Object.entries(BRANDS).map(([value, hex]) => ({
        value,
        label: `${swatch(hex)} ${value[0].toUpperCase()}${value.slice(1)}`
      })),
      initialValue: current.theme.brand
    })
  )

  const radius = stopIfCancelled(
    await p.select({
      message: 'Corner style',
      options: [
        { value: 'rounded', label: 'Rounded', hint: 'friendly, the usual choice' },
        { value: 'sharp', label: 'Sharp', hint: 'square corners, businesslike' },
        { value: 'pill', label: 'Pill', hint: 'fully round buttons, playful' }
      ],
      initialValue: current.theme.radius
    })
  )

  const font = stopIfCancelled(
    await p.select({
      message: 'Font style',
      options: [
        { value: 'modern', label: 'Modern', hint: 'clean sans-serif' },
        { value: 'friendly', label: 'Friendly', hint: 'rounded letters' },
        { value: 'classic', label: 'Classic', hint: 'serif, like a newspaper' },
        { value: 'mono', label: 'Techy', hint: 'monospace, like code' }
      ],
      initialValue: current.theme.font
    })
  )

  const apiMode = stopIfCancelled(
    await p.select({
      message: "Where does your app's data come from?",
      options: [
        { value: 'mock', label: 'Fake data built in', hint: 'works straight away, no server needed. Switch later.' },
        { value: 'remote', label: 'My own backend server', hint: 'you have an API address' }
      ],
      initialValue: current.api.mode
    })
  )

  let baseUrl = current.api.baseUrl
  if (apiMode === 'remote') {
    baseUrl = stopIfCancelled(
      await p.text({
        message: 'Backend address (API base URL)',
        placeholder: 'http://localhost:8080/api/v1',
        initialValue: current.api.baseUrl,
        validate: (value) => (/^https?:\/\/\S+$/.test(value.trim()) ? undefined : 'Start with http:// or https://')
      })
    )
      .trim()
      .replace(/\/+$/, '')
  }

  const docker = stopIfCancelled(
    await p.confirm({
      message: 'Use Docker? (runs the website in a container. Pick "No" if you don\'t know what Docker is.)',
      initialValue: current.docker
    })
  )

  const demo =
    current.demo === false
      ? false
      : stopIfCancelled(
          await p.confirm({
            message: 'Keep the example screens (todo list, users) to learn from?',
            initialValue: true
          })
        )

  return {
    name,
    targets,
    mobile,
    appId,
    theme: { mode, brand, radius, font },
    api: { mode: apiMode, baseUrl },
    docker,
    demo
  }
}

/**
 * Quick setup: one question, beginner-friendly defaults for everything else.
 * Mobile means Expo (just the free Expo Go app on your phone, no Android
 * Studio or Xcode). On a re-run, earlier choices (an emulator app, the
 * desktop app, Docker, the look) are kept so nothing gets deleted.
 */
async function quickAnswers(name, current) {
  const building = stopIfCancelled(
    await p.select({
      message: 'What are you building?',
      options: [
        { value: 'web', label: 'A website', hint: 'opens in any browser' },
        {
          value: 'web+mobile',
          label: 'A website and a mobile app',
          hint: 'test the app on your own phone with the free Expo Go app'
        },
        { value: 'mobile', label: 'Just a mobile app', hint: 'iPhone and Android, via Expo Go' }
      ],
      initialValue: current.targets.mobile ? (current.targets.web ? 'web+mobile' : 'mobile') : 'web'
    })
  )
  const wantsMobile = building !== 'web'
  return {
    name,
    targets: { web: building !== 'mobile', mobile: wantsMobile, desktop: current.targets.desktop },
    mobile: !wantsMobile
      ? { type: 'none', platforms: [] }
      : current.mobile.type === 'none'
        ? { type: 'expo', platforms: ['android', 'ios'] }
        : current.mobile,
    appId: current.setupComplete ? current.appId : defaultAppId(name),
    theme: current.theme,
    api: current.api,
    docker: current.docker,
    demo: current.demo !== false
  }
}

function answersWithoutQuestions(current) {
  const given = answersFromFlag()
  const merged = {
    ...current,
    ...given,
    targets: { ...current.targets, ...given.targets },
    mobile: { ...current.mobile, ...given.mobile },
    theme: { ...current.theme, ...given.theme },
    api: { ...current.api, ...given.api }
  }
  if (merged.targets.mobile && merged.mobile.type === 'none') merged.mobile.type = 'expo'
  if (!merged.targets.mobile) merged.mobile = { type: 'none', platforms: [] }
  if (merged.mobile.type === 'expo') merged.mobile.platforms = ['android', 'ios']
  if (merged.mobile.type === 'emulator' && !merged.mobile.platforms.length)
    merged.mobile.platforms = isMac ? ['android', 'ios'] : ['android']
  if (given.name && !given.appId && !current.setupComplete) merged.appId = defaultAppId(given.name)

  const problems = []
  if (!Object.values(merged.targets).some(Boolean))
    problems.push('pick at least one of targets.web, targets.mobile, targets.desktop')
  if (!['none', 'expo', 'emulator'].includes(merged.mobile.type))
    problems.push('mobile.type must be "expo" or "emulator"')
  if (!isValidAppId(merged.appId)) problems.push(`appId "${merged.appId}" should look like com.yourname.appname`)
  if (!BRANDS[merged.theme.brand]) problems.push(`theme.brand must be one of ${Object.keys(BRANDS).join(', ')}`)
  if (problems.length) fail(`Can't use these answers:\n- ${problems.join('\n- ')}`)
  return merged
}

// ---------------------------------------------------------------------------
// Making the changes
// ---------------------------------------------------------------------------

const TEXT_FILE = /\.(json|ts|tsx|js|cjs|mjs|yml|yaml|md|html)$/

function replacePlaceholders(dir, answers) {
  for (const entry of readdirSync(dir)) {
    const file = path.join(dir, entry)
    if (statSync(file).isDirectory()) {
      replacePlaceholders(file, answers)
    } else if (TEXT_FILE.test(entry)) {
      const text = readFileSync(file, 'utf8')
      const next = text
        .replaceAll('__APP_NAME__', answers.name)
        .replaceAll('__APP_SLUG__', slugify(answers.name))
        .replaceAll('__APP_ID__', answers.appId)
      if (next !== text) writeFileSync(file, next)
    }
  }
}

function copyTemplate(template, destination, answers) {
  cpSync(fromRoot('templates', template), fromRoot(destination), { recursive: true })
  replacePlaceholders(fromRoot(destination), answers)
}

/** Keeps the app name and id the same everywhere when they change on a later run. */
function syncNames(answers) {
  const edit = (relative, change) => {
    const file = fromRoot(relative)
    if (!existsSync(file)) return
    const text = readFileSync(file, 'utf8')
    const next = change(text)
    if (next !== text) writeFileSync(file, next)
  }
  edit('apps/web/index.html', (text) => text.replace(/<title>.*<\/title>/, `<title>${answers.name}</title>`))
  edit('apps/desktop/electron-builder.yml', (text) =>
    text
      .replace(/^appId: .*$/m, `appId: ${answers.appId}`)
      .replace(/^productName: .*$/m, `productName: ${answers.name}`)
  )
  edit('apps/desktop/main.cjs', (text) =>
    text.replace(/title: '.*',/, `title: '${answers.name.replace(/'/g, "\\'")}',`)
  )
  edit('apps/mobile/capacitor.config.ts', (text) =>
    text
      .replace(/appId: '.*'/, `appId: '${answers.appId}'`)
      .replace(/appName: '.*'/, `appName: '${answers.name.replace(/'/g, "\\'")}'`)
  )
  const expoFile = fromRoot('apps/mobile/app.json')
  if (existsSync(expoFile)) {
    const expo = readJson(expoFile)
    expo.expo.name = answers.name
    expo.expo.ios.bundleIdentifier = answers.appId
    expo.expo.android.package = answers.appId
    writeJson(expoFile, expo)
  }
}

// Example screens, removed when you answer "no" to keeping them.
const DEMO_FILES = [
  'apps/web/src/pages/todos',
  'apps/web/src/pages/users',
  'packages/api/src/todos',
  'packages/api/src/users',
  'apps/mobile/app/(tabs)/todos.tsx',
  'apps/mobile/app/(tabs)/users.tsx',
  'apps/mobile/app/users'
]
const DEMO_REGIONS = [
  'apps/web/src/app/routes.tsx',
  'apps/web/src/pages/home/HomePage.tsx',
  'packages/api/src/index.ts',
  'apps/mobile/app/(tabs)/_layout.tsx'
]

/** Deletes the lines between "demo:start" and "demo:end" markers (markers included). */
function stripDemoRegions(file) {
  if (!existsSync(file)) return
  const lines = readFileSync(file, 'utf8').split('\n')
  const kept = []
  let inDemo = false
  for (const line of lines) {
    if (line.includes('demo:start')) {
      inDemo = true
      continue
    }
    if (line.includes('demo:end')) {
      inDemo = false
      continue
    }
    if (!inDemo) kept.push(line)
  }
  writeFileSync(file, kept.join('\n'))
}

function removeDemo() {
  for (const relative of DEMO_FILES) rmSync(fromRoot(relative), { recursive: true, force: true })
  for (const relative of DEMO_REGIONS) stripDemoRegions(fromRoot(relative))
}

function approveInstallScripts(names) {
  const file = fromRoot('package.json')
  const pkg = readJson(file)
  pkg.allowScripts = { ...pkg.allowScripts }
  for (const name of names) pkg.allowScripts[name] ??= true
  writeJson(file, pkg)
}

/** Works out what to add and what to delete, without changing anything yet. */
function plan(answers) {
  const installed = installedApps()
  const add = []
  const remove = []

  if (installed.mobile !== answers.mobile.type) {
    if (installed.mobile !== 'none')
      remove.push({
        path: 'apps/mobile',
        why: `the ${installed.mobile === 'emulator' ? 'emulator (Capacitor)' : installed.mobile} mobile app`
      })
    if (answers.mobile.type === 'expo')
      add.push({ template: 'mobile-expo', to: 'apps/mobile', label: 'Mobile app (Expo)' })
    if (answers.mobile.type === 'emulator')
      add.push({ template: 'mobile-capacitor', to: 'apps/mobile', label: 'Mobile app (emulator / Capacitor)' })
  }
  if (answers.targets.desktop && !installed.desktop)
    add.push({ template: 'desktop-electron', to: 'apps/desktop', label: 'Desktop app (Electron)' })
  if (!answers.targets.desktop && installed.desktop) remove.push({ path: 'apps/desktop', why: 'the desktop app' })
  if (answers.docker && !installed.docker) add.push({ template: 'docker', to: '.', label: 'Docker files' })
  if (!answers.docker && installed.docker)
    remove.push({ path: 'docker-compose.yml', why: 'Docker' }, { path: 'docker', why: 'Docker' })
  return { add, remove }
}

function apply(answers, { add, remove }) {
  for (const item of remove) rmSync(fromRoot(item.path), { recursive: true, force: true })
  for (const item of add) copyTemplate(item.template, item.to, answers)

  // The Android build in Docker only makes sense for the emulator (Capacitor) app.
  const androidDockerfile = fromRoot('docker', 'android.Dockerfile')
  const wantsAndroidDocker =
    answers.docker && answers.mobile.type === 'emulator' && answers.mobile.platforms.includes('android')
  if (!wantsAndroidDocker) rmSync(androidDockerfile, { force: true })
  else if (!existsSync(androidDockerfile))
    cpSync(fromRoot('templates', 'docker', 'docker', 'android.Dockerfile'), androidDockerfile)

  if (!answers.demo) removeDemo()
  syncNames(answers)
  if (answers.targets.desktop) approveInstallScripts(['electron', 'electron-winstaller'])

  const config = {
    name: answers.name,
    slug: slugify(answers.name),
    appId: answers.appId,
    targets: answers.targets,
    mobile: answers.mobile,
    docker: answers.docker,
    api: answers.api,
    theme: answers.theme,
    demo: answers.demo,
    setupComplete: true
  }
  writeJson(CONFIG_FILE, config)
  formatFiles([CONFIG_FILE, 'package.json', 'apps/mobile/app.json', ...DEMO_REGIONS])
  return config
}

function install() {
  const spinner = p.spinner()
  spinner.start('Installing what your app needs (this can take a few minutes the first time)')
  const result = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    shell: process.platform === 'win32'
  })
  if (result.status !== 0) {
    spinner.stop('Installing failed', 1)
    console.error(result.stderr?.slice(-3000))
    fail('Fix the error above (or paste it to your AI assistant), then run "npm install".')
  }
  spinner.stop('Installed')
}

function nextSteps(config) {
  const lines = []
  if (config.targets.web || config.targets.desktop || config.mobile.type === 'emulator')
    lines.push('npm run dev            open the website at http://localhost:5173')
  if (config.mobile.type === 'expo')
    lines.push('npm run dev:mobile     show a QR code; scan it with the Expo Go app on your phone')
  if (config.mobile.type === 'emulator' && config.mobile.platforms.includes('android'))
    lines.push('npm run android        open the app in the Android Emulator')
  if (config.mobile.type === 'emulator' && config.mobile.platforms.includes('ios'))
    lines.push('npm run ios            open the app in the iPhone Simulator')
  if (config.targets.desktop) lines.push('npm run dev:desktop    open the desktop app')
  if (config.docker) lines.push('npm run docker:dev     run the website in Docker instead')
  lines.push('npm run doctor         check this computer has everything it needs')
  lines.push('npm run generate       create a page, component or API the right way')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------

async function main() {
  if (!nonInteractive) console.clear()
  p.intro(" Let's set up your app ")

  const current = readConfig()
  if (!nonInteractive && !process.stdin.isTTY) {
    fail(
      'No keyboard input available. Run "npm run setup" in a terminal, or pass answers: npm run setup -- --yes (see scripts/setup.mjs).'
    )
  }
  if (current.setupComplete && !nonInteractive) {
    p.log.info('This project was set up before. Your current answers are pre-filled; change what you like.')
  }

  const answers = nonInteractive ? answersWithoutQuestions(current) : await askQuestions(current)
  const changes = plan(answers)

  if (changes.remove.length) {
    const list = [...new Set(changes.remove.map((item) => `${item.path}  (${item.why})`))].join('\n')
    p.note(list, 'These will be DELETED, including any changes you made in them')
    if (nonInteractive && !force) fail('Not deleting anything without --force. Add --force to confirm.')
    if (!nonInteractive) {
      const ok = stopIfCancelled(await p.confirm({ message: 'Delete them?', initialValue: false }))
      if (!ok) fail('Nothing was changed.')
    }
  }

  if (!nonInteractive) {
    const summary = [
      `Name:     ${answers.name}${answers.targets.mobile || answers.targets.desktop ? `  (${answers.appId})` : ''}`,
      `Runs on:  ${[answers.targets.web && 'website', answers.targets.mobile && `mobile (${answers.mobile.type === 'expo' ? 'Expo' : `emulator: ${answers.mobile.platforms.join(' + ')}`})`, answers.targets.desktop && 'desktop'].filter(Boolean).join(', ')}`,
      `Look:     ${answers.theme.mode} mode, ${answers.theme.brand}, ${answers.theme.radius} corners, ${answers.theme.font} font`,
      `Data:     ${answers.api.mode === 'mock' ? 'fake data built in' : answers.api.baseUrl}`,
      `Docker:   ${answers.docker ? 'yes' : 'no'}`,
      `Examples: ${answers.demo ? 'kept' : 'removed'}`
    ].join('\n')
    p.note(summary, 'Your choices')
    const ok = stopIfCancelled(await p.confirm({ message: 'Set it up like this?', initialValue: true }))
    if (!ok) fail('Nothing was changed. Run "npm run setup" to start again.')
  }

  const config = apply(answers, changes)
  for (const item of changes.add) p.log.success(`Added ${item.label}`)
  if (!answers.demo) p.log.success('Removed the example screens')
  p.log.success('Saved your answers in project.config.json')

  if (!skipInstall) install()

  p.note(nextSteps(config), 'What to do next (type these in the terminal)')
  p.outro('All set. Tip: open this folder in your AI assistant and say what you want to build.')
}

main().catch((error) => {
  console.error(error)
  fail('Setup stopped because of the error above. Paste it to your AI assistant for help.')
})
