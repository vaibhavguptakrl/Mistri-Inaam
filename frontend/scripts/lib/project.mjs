// Shared helpers for the setup wizard, the run/doctor scripts and the Plop generators.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const CONFIG_FILE = path.join(ROOT, 'project.config.json')

export const fromRoot = (...parts) => path.join(ROOT, ...parts)

export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
export const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)

export const readConfig = () => readJson(CONFIG_FILE)

/** What is actually in apps/mobile right now: 'expo', 'emulator' (Capacitor) or 'none'. */
export function installedMobileType() {
  const file = fromRoot('apps', 'mobile', 'package.json')
  if (!existsSync(file)) return 'none'
  const pkg = readJson(file)
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (deps.expo) return 'expo'
  if (deps['@capacitor/core']) return 'emulator'
  return 'unknown'
}

/** The apps that exist in this project. */
export function installedApps() {
  return {
    web: existsSync(fromRoot('apps', 'web', 'package.json')),
    mobile: installedMobileType(),
    desktop: existsSync(fromRoot('apps', 'desktop', 'package.json')),
    docker: existsSync(fromRoot('docker-compose.yml'))
  }
}

/** "My Cool App" -> "my-cool-app" */
export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'my-app'

/** "My Cool App" -> "com.example.mycoolapp" */
export const defaultAppId = (name) => `com.example.${slugify(name).replace(/-/g, '') || 'myapp'}`

export const isValidAppId = (id) => /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(id)

export const isMac = process.platform === 'darwin'

/** Formats files the way `npm run format` would, so generated code matches hand-tidied code. */
export function formatFiles(files) {
  const existing = files.map((file) => path.resolve(ROOT, file)).filter((file) => existsSync(file))
  if (!existing.length) return
  const prettier = path.join(ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
  if (!existsSync(prettier)) return
  spawnSync(process.execPath, [prettier, '--write', '--log-level', 'silent', ...existing], {
    cwd: ROOT,
    stdio: 'ignore'
  })
}
