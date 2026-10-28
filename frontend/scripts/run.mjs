// Behind the root npm scripts (npm run dev, npm run android, ...). It checks
// the app you asked for exists and explains what to do when it doesn't,
// instead of failing with a confusing error.
import { spawnSync } from 'node:child_process'
import { installedApps, readConfig, ROOT } from './lib/project.mjs'

const [task, ...extra] = process.argv.slice(2)
const config = readConfig()
const apps = installedApps()

const say = (message) => console.log(`\n${message}\n`)

function stop(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

function run(command, args) {
  const result = spawnSync(command, [...args, ...extra], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  })
  process.exit(result.status ?? 1)
}

const npm = (...args) => run('npm', args)

function hasCommand(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0
}

const needMobile = () => {
  if (apps.mobile === 'none') stop('This project has no mobile app yet. Run "npm run setup" and tick "Mobile app".')
}
const needDesktop = () => {
  if (!apps.desktop) stop('This project has no desktop app yet. Run "npm run setup" and tick "Desktop app".')
}
const needDocker = () => {
  if (!apps.docker) stop('Docker isn\'t set up for this project. Run "npm run setup" and answer "Yes" to Docker.')
  if (!hasCommand('docker'))
    stop(
      "Docker isn't installed. Get Docker Desktop from https://www.docker.com/products/docker-desktop/ and start it."
    )
}

if (!config.setupComplete && task !== 'build' && task !== 'build:web') {
  say('Tip: you haven\'t run "npm run setup" yet, so the app uses the default name and look.')
}

const tasks = {
  dev() {
    if (!config.targets.web && apps.mobile === 'expo' && !apps.desktop) return tasks['dev:mobile']()
    if (apps.mobile === 'expo')
      say('Opening the website. For the phone app run "npm run dev:mobile" in a second terminal.')
    return tasks['dev:web']()
  },
  'dev:web': () => npm('run', 'dev', '--workspace', '@app/web'),
  'dev:mobile'() {
    needMobile()
    if (apps.mobile === 'emulator') stop('Your mobile app runs in an emulator. Use "npm run android" or "npm run ios".')
    say(
      'Scan the QR code below with your phone (Camera app on iPhone, Expo Go app on Android). Same Wi-Fi as this computer.'
    )
    return npm('run', 'start', '--workspace', '@app/mobile')
  },
  'dev:desktop'() {
    needDesktop()
    return npm('run', 'dev', '--workspace', '@app/desktop')
  },
  android() {
    needMobile()
    if (apps.mobile === 'emulator' && !config.mobile.platforms.includes('android'))
      say("Android wasn't picked during setup, trying anyway.")
    return npm('run', 'android', '--workspace', '@app/mobile')
  },
  ios() {
    needMobile()
    if (process.platform !== 'darwin')
      stop(
        'The iPhone Simulator only runs on a Mac. On Windows/Linux use "npm run android", or Expo Go on a real iPhone.'
      )
    return npm('run', 'ios', '--workspace', '@app/mobile')
  },
  build() {
    say('Building the website into apps/web/dist. Other builds: npm run build:desktop, npm run build:android')
    return tasks['build:web']()
  },
  'build:web': () => npm('run', 'build', '--workspace', '@app/web'),
  'build:desktop'() {
    needDesktop()
    return npm('run', 'build', '--workspace', '@app/desktop')
  },
  'build:android'() {
    needMobile()
    if (apps.mobile === 'expo') {
      say(
        [
          'Expo apps are built in the cloud with EAS (free tier available):',
          '  1. Make a free account at https://expo.dev',
          '  2. cd apps/mobile && npx eas-cli build --platform android --profile preview',
          'It gives you a link to download the installable app.'
        ].join('\n')
      )
      return process.exit(0)
    }
    if (extra.includes('--docker')) {
      needDocker()
      extra.splice(extra.indexOf('--docker'), 1)
      spawnSync('docker', ['build', '-f', 'docker/android.Dockerfile', '-t', `${config.slug}-android`, '.'], {
        cwd: ROOT,
        stdio: 'inherit'
      })
      return run('docker', ['run', '--rm', '-v', `${ROOT}/artifacts:/artifacts`, `${config.slug}-android`])
    }
    return npm('run', 'build:android', '--workspace', '@app/mobile')
  },
  'docker:dev'() {
    needDocker()
    say('Starting the website in Docker at http://localhost:5173 (first start takes a few minutes). Stop with Ctrl+C.')
    return run('docker', ['compose', 'up', '--build', 'web'])
  },
  'docker:prod'() {
    needDocker()
    say('Building the finished website and serving it at http://localhost:8080. Stop with Ctrl+C.')
    return run('docker', ['compose', '--profile', 'prod', 'up', '--build', 'web-prod'])
  },
  'docker:down'() {
    needDocker()
    return run('docker', ['compose', '--profile', 'prod', 'down'])
  }
}

if (!tasks[task]) stop(`Unknown task "${task}". See the "scripts" in package.json.`)
tasks[task]()
