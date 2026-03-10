## Cursor Cloud specific instructions

### Overview

keybr.com is a TypeScript/React monorepo (~77 packages under `packages/`) that provides an intelligent touch-typing tutor. It uses npm workspaces, lage as a task runner, and webpack for bundling.

### Prerequisites

- **Node.js v24** is required. Install via `nvm install 24 && nvm use 24`.
- Environment config lives at `/etc/keybr/env` (copied from `.env.example`). SQLite is the default dev database — no external DB server needed.

### Key commands

Standard dev commands are in the root `package.json`:

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Compile (type-check) | `npm run compile` |
| Build (dev bundle) | `npm run build-dev` |
| Init database | `./packages/devenv/lib/initdb.ts` |
| Start server | `npm start` (serves at http://localhost:3000) |
| Watch mode | `npm run watch` (run alongside `npm start`) |
| ESLint | `npm run lint` |
| Stylelint | `npm run stylelint` |
| Tests | `env DATABASE_CLIENT=sqlite npm test` |

### Non-obvious caveats

- `npm run compile` runs `tsc` for each package via lage. There is a pre-existing type error in `@keybr/instrument` (CodePointSet iterator issue). This does **not** block the webpack build because `ts-loader` uses `transpileOnly: true`.
- The webpack build (`npm run build-dev`) must complete before `npm start` — the server expects bundled assets in `root/public/assets/` and compiled server code in `root/lib/`.
- Database initialization (`./packages/devenv/lib/initdb.ts`) creates the SQLite schema and a test user. Login with the test account at `http://localhost:3000/login/xyz`.
- The server runs in cluster mode (4 HTTP workers on port 3000 + 1 WebSocket worker on port 3001).
- Pre-commit hook runs `lint-staged` via husky.
