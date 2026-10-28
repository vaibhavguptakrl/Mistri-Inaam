# Backend Boilerplate — Express + Socket.io

A scalable Node.js service boilerplate built on Express (REST), Socket.io (real-time), Sequelize (SQLite or Postgres/Supabase), optional Redis (pubsub/socket adapter), AJV (schema validation), i18n, and Winston logging, wired together with a consistent layered architecture (routes → controllers → services → models).

## Node JS version used: >= 20 (see `.nvmrc`)

## Getting started
```bash
npm run setup
```
The setup wizard asks a few questions and does the rest: writes `.env` (with
fresh random secrets), starts Docker services if you picked them, creates the
database tables and adds example data. Pick **Quick setup** if you're not sure:
it uses SQLite (a file in `data/`, nothing to install) and no Redis.

Then run `npm run start:dev` and open http://localhost:8080/api/v1/demo.

| Database option | Needs |
|---|---|
| SQLite (default) | nothing |
| Supabase | a free supabase.com project; paste its **Session pooler** connection string |
| Postgres in Docker | Docker Desktop |
| Postgres on this computer | Postgres installed and running |
| Any Postgres connection string | Neon, Railway, AWS, ... |

**Redis is optional.** Without it, Socket.io and the rate limiter keep their
state in memory, which is fine while you run one copy of the API. Add it
(Docker, or a hosted `rediss://` URL from e.g. Upstash) once you run several.

- `npm run setup` again any time to change an answer (it keeps your code and other `.env` values).
- `npm run doctor` checks Node, the database connection, pending migrations and Redis, with a fix for each problem (`-- --json` for machine-readable output).
- Without a keyboard: `npm run setup -- --yes` (defaults) or `npm run setup -- --answers '{"database":"supabase","databaseUrl":"postgresql://..."}'` — see the top of `scripts/setup.mjs`.

Or run the whole stack (app + Postgres + Redis) in containers: `docker compose up`.

## How to run application in production mode
- Copy `.env.sample` to `.env` and fill in the values
- Run `npm i` to install dependencies
- Run `make build` to build the project
- Run `npm run start` to start the project

## Other NPM scripts and Make Commands
- `npm run lint` — lint the application, auto-fixing what it can
- `npm run lint:ci` — lint in check-only mode (what CI runs)
- `npm test` / `npm run test:watch` — run the Jest test suite
- `npm run sequelize` — sequelize cli; `npm run db:migrate` / `npm run db:seed` for the common cases
- `npm run generate` — scaffold a new resource/service/socket/model/constant (see [Code generators](#code-generators) below)
- `make clean` — delete the project build
- `make push` — push the current branch (force-with-lease)
- `make pull` — pull the current branch with rebase

## What's included
- **REST layer**: Express app with helmet, cors, body-parser (explicit size limits), cookie-parser, morgan, i18n, a default rate limiter, and a request/response validation pipeline built on AJV JSON schemas.
- **Real-time layer**: Socket.io server with a Redis adapter for horizontal scaling (in-memory when Redis isn't configured), namespaces, request/response validation middleware mirroring the REST layer, and an emitter for server-initiated pushes.
- **Service layer**: every unit of business logic extends `ServiceBase` — a consistent `run()` lifecycle with input validation, structured logging, and an error-collection pattern (`addError`) instead of throwing ad-hoc exceptions.
- **DB layer**: Sequelize on SQLite (default) or Postgres — host-based with read/write replica config, or a single `DATABASE_URL` (Supabase, Neon) — a working migration + seeder + model example, wired via `.sequelizerc`.
- **Auth stub**: a Passport JWT strategy and an `isAuthenticated` middleware, plus `hashPassword`/`comparePassword`/`signAccessToken` helpers — deliberately left as a stub (no signup/login flow) for you to wire up to your own user model.
- **Errors**: a `BaseError`/`APIError`/`ValidationError` hierarchy plus a central error-type registry (`utils/constants/errors.js`) so every error carries a stable `errorCode`, HTTP status, and i18n-able description.
- **Rate limiting**: an in-memory-by-default limiter factory (`rest-resources/middlewares/rateLimiter.middleware.js`), with an opt-in Redis-backed distributed mode for production (multi-instance) deployments.
- **`catchAsync` helper**: wraps controller methods so a rejected promise reaches the error handler without manual try/catch everywhere.
- **Path alias**: `~` resolves to `src/` (via `babel-plugin-module-resolver`), so cross-folder imports never need `../../../` chains — only same-folder imports stay relative.
- **API docs**: an OpenAPI spec generated from `@openapi` JSDoc comments on route files, served at `/api-docs` in non-production environments.
- **Tests**: a Jest + Supertest example (`test/demo.routes.test.js`) showing the pattern for mocking `~/db/models` and `~/libs/redisClient` so route tests don't need a live database/Redis.
- **Local dev environment**: `docker-compose.yml` for Postgres + Redis (+ optionally the app itself, hot-reloading via a bind mount).
- **CI**: a GitHub Actions workflow (`.github/workflows/ci.yml`) running lint, test, and build on every push/PR.
- **Docker + k8s**: multi-stage Dockerfile and Helm-style values files for develop/production.

## Extending this boilerplate
- New REST resource: run `npm run generate resource`, or by hand — add a service under `src/services/<name>/`, a controller under `src/rest-resources/controllers/`, a route file under `src/rest-resources/routes/api/v1/`, and register it in `src/rest-resources/routes/api/v1/index.js`. Copy `demo.*` as your starting point.
- New socket namespace: run `npm run generate socket`, or by hand — same idea under `src/socket-resources/`, copying `demo.namespace.js` / `demo.handler.js` / `demo.emitter.js`.
- Real auth: add a `User` model, flesh out the verify callback in `src/rest-resources/middlewares/passport.js`, and build signup/login services using `src/utils/auth.utils.js`.

## Code generators
Two ways to scaffold new code, both documented in full in `CLAUDE.md`:

- **`npm run generate`** — a [Plop](https://plopjs.com/)-based CLI for the mechanical, no-judgment-needed cases. Run it with no arguments for an interactive menu, or jump straight to one:
  - `npm run generate resource` — service(s) + controller + routes + JSON schema for a new REST resource, wired into `v1/index.js`
  - `npm run generate service` — one more service added to an existing resource
  - `npm run generate socket` — handler + namespace + emitter for a new socket namespace, wired into the namespace index and `utils/constants/socket.js`
  - `npm run generate model` — a Sequelize model + migration (+ optional seeder)
  - `npm run generate constant` — an error type, a success message, or a whole new constants file
- **`.claude/commands/*.md` slash commands** (`/generate-resource`, `/generate-service`, `/generate-socket`, `/generate-model`, `/generate-constant`, `/generate-middleware`) — for the same file types, but used through Claude Code when there's real wiring or judgment involved that a template can't decide on its own (e.g. what validation a service actually needs, or a middleware with real logic).

## For coding guide look at [Coding Guide](./coding-guide.md)
## For folder structure guide look at [Folder Structure Guide](./folder-structure-guide.md)
