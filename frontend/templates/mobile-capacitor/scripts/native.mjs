// Helper behind `npm run android` / `npm run ios`: builds the website, creates
// the native project the first time, copies the website in, then runs it.
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobileDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const [action = 'run', platform = 'android'] = process.argv.slice(2)

function run(command, args, cwd = mobileDir) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.error(
      `\n✖ "${command} ${args.join(' ')}" failed. Run "npm run doctor" to check your computer is set up for ${platform}.`
    )
    process.exit(result.status ?? 1)
  }
}

if (platform === 'ios' && process.platform !== 'darwin') {
  console.error('✖ iPhone apps can only be built on a Mac with Xcode installed.')
  process.exit(1)
}

const platforms =
  action === 'sync' ? ['android', 'ios'].filter((name) => existsSync(path.join(mobileDir, name))) : [platform]

if (action !== 'open') run('npm', ['--prefix', '../web', 'run', 'build'])

for (const name of platforms) {
  if (!existsSync(path.join(mobileDir, name))) run('npx', ['cap', 'add', name])
  if (action !== 'open') run('npx', ['cap', 'sync', name])
}

if (action === 'run') run('npx', ['cap', 'run', platform])
if (action === 'open') run('npx', ['cap', 'open', platform])
if (action === 'build') {
  const gradle = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
  run(gradle, [process.env.RELEASE === '1' ? 'assembleRelease' : 'assembleDebug'], path.join(mobileDir, 'android'))
  console.log('\n✔ APK ready in apps/mobile/android/app/build/outputs/apk/')
}
