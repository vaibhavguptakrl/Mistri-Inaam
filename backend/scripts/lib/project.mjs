// Shared helpers for `npm run setup` and `npm run doctor`.
// Plain Node (no Babel, no `~` alias) so they run before anything is built,
// on macOS, Windows and Linux alike.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const fromRoot = (...parts) => path.join(ROOT, ...parts)
export const CONFIG_FILE = fromRoot('project.config.json')
export const ENV_FILE = fromRoot('.env')
export const ENV_SAMPLE_FILE = fromRoot('.env.sample')

const require = createRequire(import.meta.url)

/** Loads a package from this project's node_modules, or null when it isn't installed. */
export function optionalRequire (name) {
  try {
    return require(require.resolve(name, { paths: [ROOT] }))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Answers, saved (without secrets) in project.config.json
// ---------------------------------------------------------------------------

export const DATABASES = ['sqlite', 'postgres-docker', 'postgres-local', 'supabase', 'postgres-url']
export const REDIS_OPTIONS = ['none', 'docker', 'url']

// The beginner-friendly defaults: nothing to install, no accounts.
export const DEFAULTS = {
  name: 'My App',
  database: 'sqlite',
  redis: 'none',
  port: 8080,
  frontendUrl: 'http://localhost:5173',
  exampleData: true,
  setupComplete: false
}

export const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
export const writeJson = (file, value) => writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)

export function readConfig () {
  return existsSync(CONFIG_FILE) ? { ...DEFAULTS, ...readJson(CONFIG_FILE) } : { ...DEFAULTS }
}

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'app'

// ---------------------------------------------------------------------------
// .env
// ---------------------------------------------------------------------------

/** Minimal dotenv-compatible parser (KEY=value, optional quotes, # comments). */
export function parseEnv (text) {
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (!match) continue
    let value = (match[2] ?? '').trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1)
      if (quote === '"') value = value.replace(/\\n/g, '\n')
    } else {
      value = value.replace(/\s+#.*$/, '')
    }
    env[match[1]] = value
  }
  return env
}

export function readEnv () {
  return existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, 'utf8')) : {}
}

const quoteEnvValue = (value) => {
  const text = String(value)
  if (!/[\s#"'`\\]/.test(text)) return text
  return text.includes("'") ? `"${text.replace(/"/g, '\\"')}"` : `'${text}'`
}

/**
 * Sets keys in .env, keeping every other line (comments, keys you added) as is.
 * Starts from .env.sample when there is no .env yet.
 */
export function updateEnv (updates) {
  let text = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8')
    : existsSync(ENV_SAMPLE_FILE)
      ? readFileSync(ENV_SAMPLE_FILE, 'utf8')
      : ''
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${quoteEnvValue(value ?? '')}`
    const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'm')
    if (pattern.test(text)) {
      text = text.replace(pattern, () => line)
    } else {
      text = `${text.replace(/\s*$/, '')}\n${line}\n`
    }
  }
  writeFileSync(ENV_FILE, text)
}

export const generateSecret = () => randomBytes(32).toString('hex')
export const isPlaceholderSecret = (value) => !value || value === 'change-me'

// ---------------------------------------------------------------------------
// Database and Redis settings, read the same way src/configs/app.config.js does
// ---------------------------------------------------------------------------

const truthy = (value) => ['true', '1', 'yes'].includes(String(value).toLowerCase())

export function databaseSettings (env) {
  const dialect = env.DB_DIALECT || 'sqlite'
  if (dialect === 'sqlite') {
    return { dialect, storage: path.resolve(ROOT, env.DB_STORAGE || 'data/database.sqlite') }
  }
  return {
    dialect,
    url: env.DATABASE_URL || '',
    ssl: truthy(env.DB_SSL),
    host: env.DB_WRITE_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD ?? 'postgres',
    database: env.DB_NAME || 'backend_boilerplate'
  }
}

/** Where the database is, in words, without leaking a password. */
export function describeDatabase (settings) {
  if (settings.dialect === 'sqlite') return `SQLite file ${path.relative(ROOT, settings.storage)}`
  if (settings.url) {
    try {
      const url = new URL(settings.url)
      return `Postgres at ${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`
    } catch {
      return 'Postgres (DATABASE_URL)'
    }
  }
  return `Postgres at ${settings.host}:${settings.port}/${settings.database}`
}

export function redisSettings (env) {
  const url = env.REDIS_URL || ''
  const host = env.REDIS_DB_HOST || ''
  return {
    enabled: Boolean(url || host),
    url,
    host,
    port: Number(env.REDIS_DB_PORT || 6379),
    password: env.REDIS_DB_PASSWORD || undefined
  }
}

// ---------------------------------------------------------------------------
// Live checks
// ---------------------------------------------------------------------------

/** Runs `sql` against the configured database. Resolves to the rows. */
export async function queryDatabase (settings, sql) {
  if (settings.dialect === 'sqlite') {
    const sqlite3 = optionalRequire('sqlite3')
    if (!sqlite3) {
      const error = new Error('The SQLite driver (sqlite3) is not installed')
      error.code = 'NO_SQLITE_DRIVER'
      throw error
    }
    mkdirSync(path.dirname(settings.storage), { recursive: true })
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(settings.storage, (openError) => {
        if (openError) return reject(openError)
        db.all(sql, (error, rows) => db.close(() => (error ? reject(error) : resolve(rows))))
      })
    })
  }

  const pg = optionalRequire('pg')
  if (!pg) throw new Error('The Postgres driver (pg) is not installed. Run: npm install')
  const client = new pg.Client({
    ...(settings.url
      ? { connectionString: settings.url }
      : {
          host: settings.host,
          port: settings.port,
          user: settings.user,
          password: settings.password,
          database: settings.database
        }),
    ssl: settings.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 8000
  })
  try {
    await client.connect()
    const result = await client.query(sql)
    return result.rows
  } finally {
    await client.end().catch(() => {})
  }
}

/** Creates the Postgres database itself (for local / Docker Postgres where it may not exist yet). */
export async function createPostgresDatabase (settings) {
  const pg = optionalRequire('pg')
  const client = new pg.Client({
    host: settings.host,
    port: settings.port,
    user: settings.user,
    password: settings.password,
    database: 'postgres',
    ssl: settings.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 8000
  })
  await client.connect()
  try {
    await client.query(`CREATE DATABASE "${settings.database.replace(/"/g, '""')}"`)
  } finally {
    await client.end().catch(() => {})
  }
}

/** Turns a connection error into a plain-English reason and fix. */
export function explainDatabaseError (error, settings) {
  const code = error?.code
  if (code === 'NO_SQLITE_DRIVER') {
    return {
      reason: 'The SQLite driver did not install on this computer.',
      fix: 'Run "npm install" again. If it still fails, choose Postgres instead with "npm run setup".'
    }
  }
  if (code === 'ECONNREFUSED') {
    return {
      reason: `Nothing is answering at ${settings.host}:${settings.port}.`,
      fix: 'Start Postgres (Docker: "docker compose up -d postgres"), or check DB_WRITE_HOST / DB_PORT in .env.'
    }
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return {
      reason: 'The database address could not be found.',
      fix: 'Check the connection string / host in .env, and that you are online.'
    }
  }
  if (code === '28P01') {
    return { reason: 'The database rejected the username or password.', fix: 'Check the password in .env.' }
  }
  if (code === '3D000') {
    return {
      reason: `The database "${settings.database}" does not exist yet.`,
      fix: 'Run "npm run setup" again (it creates it), or create it yourself.'
    }
  }
  if (/self.signed|SSL|ssl/.test(error?.message || '')) {
    return {
      reason: `SSL problem: ${error.message}`,
      fix: 'Hosted Postgres (Supabase, Neon, ...) needs DB_SSL=true in .env; a local one usually needs DB_SSL=false.'
    }
  }
  if (/timeout/i.test(error?.message || '')) {
    return {
      reason: 'The database did not answer in time.',
      fix: 'For Supabase use the "Session pooler" connection string (the direct one needs IPv6). Check that you are online.'
    }
  }
  return { reason: error?.message || String(error), fix: 'Check the database settings in .env.' }
}

export async function checkDatabase (settings) {
  try {
    await queryDatabase(settings, 'SELECT 1')
    return { ok: true }
  } catch (error) {
    return { ok: false, code: error.code, ...explainDatabaseError(error, settings) }
  }
}

/** Migration files that are not recorded in the database yet. */
export async function pendingMigrations (settings) {
  const files = readdirSync(fromRoot('src', 'db', 'migrations')).filter((file) => file.endsWith('.js')).sort()
  let done = []
  try {
    done = (await queryDatabase(settings, 'SELECT name FROM "SequelizeMeta"')).map((row) => row.name)
  } catch {
    // No SequelizeMeta table yet: nothing has been migrated.
  }
  return files.filter((file) => !done.includes(file))
}

export async function checkRedis (settings) {
  if (!settings.enabled) return { ok: true, disabled: true }
  const Redis = optionalRequire('ioredis')
  const options = { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 0, retryStrategy: () => null }
  const client = settings.url
    ? new Redis(settings.url, options)
    : new Redis({ host: settings.host, port: settings.port, password: settings.password, ...options })
  client.on('error', () => {})
  try {
    await client.connect()
    await client.ping()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: error.message,
      fix: settings.url
        ? 'Check REDIS_URL in .env (hosted Redis like Upstash uses rediss://).'
        : 'Start Redis ("docker compose up -d redis"), or remove REDIS_DB_HOST from .env to run without Redis.'
    }
  } finally {
    client.disconnect()
  }
}
