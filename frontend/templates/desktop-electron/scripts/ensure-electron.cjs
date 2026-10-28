// Makes sure Electron's program is fully downloaded before the app starts.
// Electron's own installer can stop half-way on very new Node.js versions
// (it leaves no node_modules/electron/path.txt); this finishes the job with
// the system's unzip tool. Does nothing when Electron is already fine.
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const electronDir = path.dirname(require.resolve('electron/package.json'))
const pathFile = path.join(electronDir, 'path.txt')
const executable =
  {
    darwin: 'Electron.app/Contents/MacOS/Electron',
    win32: 'electron.exe'
  }[process.platform] ?? 'electron'

if (fs.existsSync(pathFile) && fs.existsSync(path.join(electronDir, 'dist', executable))) process.exit(0)

async function repair() {
  console.log('Finishing the Electron download (one time only)...')
  const { downloadArtifact } = require(require.resolve('@electron/get', { paths: [electronDir] }))
  const { version } = require(path.join(electronDir, 'package.json'))
  const zip = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: process.platform,
    arch: process.arch
  })
  const dist = path.join(electronDir, 'dist')
  fs.rmSync(dist, { recursive: true, force: true })
  fs.mkdirSync(dist, { recursive: true })
  const unzip =
    process.platform === 'win32'
      ? spawnSync('tar', ['-xf', zip, '-C', dist], { stdio: 'inherit' })
      : spawnSync('unzip', ['-q', '-o', zip, '-d', dist], { stdio: 'inherit' })
  if (unzip.status !== 0) throw new Error('Could not unzip Electron. Try: rm -rf node_modules/electron && npm install')
  const types = path.join(dist, 'electron.d.ts')
  if (fs.existsSync(types)) fs.renameSync(types, path.join(electronDir, 'electron.d.ts'))
  fs.writeFileSync(pathFile, executable)
  console.log('Electron is ready.')
}

repair().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
