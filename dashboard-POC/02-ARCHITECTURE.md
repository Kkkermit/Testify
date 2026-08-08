# 2. Architecture

## The one decision everything else follows from

**The API runs inside the bot process.**

The dashboard's most valuable data is not in Mongo — it is in the running client's cache. Guild names, channel
lists, role lists and hierarchy, member counts, whether the bot can actually post in the channel someone just
picked. A separate API service can get at none of that without either opening a second gateway connection (a
second presence, double the memory, and Discord counts it against you) or hammering the REST API on every page
load and living inside its rate limits.

In-process, `GET /api/guilds/:id/roles` is `client.guilds.cache.get(id)?.roles.cache` — no network call at all.

It is also the answer that matches "easy to setup": one process, one port, one `npm start`, one thing to keep
alive. A self-hoster does not have to run and reverse-proxy two services.

**What it costs, and the mitigation.** One process means one failure is two outages unless each layer contains
its own. `src/core/shutdown.ts` keeps the process alive through anything unexpected (CLAUDE.md §16), and on top
of that:

- Every route body is wrapped in a top-level error boundary that converts a throw into a 500 and logs it. The
  bot's own `runCommand` wrapper is the precedent; the API gets `runRoute`.
- The HTTP server is started **after** `client.login()` succeeds and is closed in the existing shutdown path.
- Handlers never block: no synchronous canvas rendering, no unbounded Mongo scans. Anything slow gets a
  `limit`.

If you later outgrow one process, the split is: keep the API in the bot, move the _static file serving_ to a CDN.
Do not move the API out.

### The rejected alternative, for the record

A standalone `apps/api` service talking to the same Mongo, with a small internal HTTP channel back to the bot for
anything needing the client. It is more scalable and worse in every way that matters here: two deploys, an
internal auth mechanism between them, and a second failure mode where the dashboard is up but reports every guild
as missing. Revisit only if the dashboard's traffic starts affecting gateway latency, which for a bot this size
it will not.

## HTTP layer: Hono

Recommended: **[Hono](https://hono.dev) + `@hono/node-server`**.

- Two dependencies, no transitive tail. The bot currently has 14 runtime deps and the value of that is real.
- Its TypeScript inference is the best of the options — typed path params and typed middleware context, which
  matters because the guild-permission middleware needs to hand a validated `guild` and `member` down to the
  handler without a cast.
- Cookies, CORS, and static file serving are first-party middleware.
- It is a standard `Request`/`Response` framework, so route handlers are testable by calling `app.request()` with
  no server listening and no supertest.

**Alternative: Fastify.** Pick it instead if you want a bigger plugin ecosystem (`@fastify/rate-limit`,
`@fastify/helmet`) rather than writing 30 lines of middleware. Costs ~4 more dependencies. Both are fine; do not
pick Express, whose async error handling would need wrapping anyway.

**Not tRPC.** It is a good tool, but it couples the frontend build to the server's types across a workspace
boundary and makes the API unusable from anything but this SPA. A plain REST contract validated by shared zod
schemas gets most of the type safety with none of the coupling.

## Repository layout

npm workspaces, so one `npm ci` at the root installs everything.

```
Testify/
├── package.json              workspaces: ["dashboard", "shared"]
├── src/                      the bot, unchanged in structure
│   ├── api/                  NEW — the dashboard's server
│   │   ├── server.ts         creates the Hono app, starts/stops it
│   │   ├── context.ts        the typed request context (client, env, session)
│   │   ├── middleware/
│   │   │   ├── session.ts    reads the cookie, loads the session
│   │   │   ├── requireOwner.ts
│   │   │   ├── requireGuild.ts   resolves + re-verifies Manage Server
│   │   │   ├── csrf.ts
│   │   │   └── rateLimit.ts
│   │   ├── routes/
│   │   │   ├── auth.ts       login, callback, logout, me
│   │   │   ├── guilds.ts     list, overview, channels, roles
│   │   │   ├── settings.ts   one route group per feature
│   │   │   ├── moderation.ts
│   │   │   ├── economy.ts
│   │   │   ├── levelling.ts
│   │   │   └── owner.ts
│   │   └── static.ts         serves dashboard/dist in production
│   ├── database/
│   │   ├── models/dashboardSession.schema.ts    NEW
│   │   └── models/dashboardAudit.schema.ts      NEW
│   └── …
├── shared/                   NEW — types and zod schemas both sides import
│   ├── package.json          name: "@testify/shared"
│   └── src/
│       ├── api.ts            request/response types per endpoint
│       ├── schemas.ts        zod schemas — validated server-side, reused in forms
│       └── permissions.ts    pure role logic, tested once, used by both
└── dashboard/                NEW — the Vite SPA
    ├── package.json
    ├── vite.config.ts
    ├── jest.config.ts
    ├── index.html
    └── src/…                 see 07-FRONTEND.md
```

**Why a `shared` workspace.** Zod is already a bot dependency. A single `levelSettingsSchema` in `shared/` is
what the API validates a request body with _and_ what `react-hook-form` validates the form with. One definition,
so the form cannot accept something the API rejects. This is the cheapest correctness win in the whole plan.

`shared/` must stay dependency-light: zod and nothing else. No discord.js, no React. It gets imported by both a
CommonJS bot build and an ESM browser build, so it ships plain TS compiled by each consumer rather than shipping
its own build output — simplest is `"main": "src/index.ts"` with both sides transpiling it.

### Workspace consequences to plan for

- Root `tsconfig.json` gains a path alias for `@testify/shared`; the dashboard has **its own** tsconfig with
  `jsx: react-jsx`, `lib: ["DOM"]`, and `moduleResolution: bundler`. Do not try to make one tsconfig serve both.
- Root `jest.config.ts` stays `node`; the dashboard gets its own with `testEnvironment: "jsdom"`. `npm test` at
  the root should run both projects (Jest's `projects` option, or two scripts and a `&&`).
- `eslint.config.mjs` needs a dashboard block with the React and jsx-a11y plugins, scoped by files glob. Per
  `CLAUDE.md`, every override in that file carries a comment saying why.
- `.github/workflows/ci.yml`'s `build` job must build the dashboard too, and the `dist/` alias grep must not
  trip over the SPA bundle.
- `tsup` must not try to compile `dashboard/`. Its entry globs are explicit, so check them.

## How a request reaches the database

```
Browser
  │  GET /api/guilds/123/levelling      cookie: dash_session=…
  ▼
Hono app  (in the bot process)
  │  1. rateLimit         — per session, per route class
  │  2. session           — cookie → Mongo session doc → { userId, isOwner }
  │  3. csrf              — mutating verbs only
  │  4. requireGuild      — client.guilds.cache.get("123")
  │                        → guild.members.fetch(userId)
  │                        → permissions.has(ManageGuild) || isOwner
  │                        → attaches { guild, member } to context
  ▼
Route handler
  │  getLevelSettings("123")            ← the SAME repository the command uses
  │  normaliseSettings(…)               ← the SAME pure logic /levelling uses
  ▼
Response  { enabled, boosts, rewards, … }   ← shape from @testify/shared
```

The handler is thin on purpose. It validates input, calls a repository or an action module, and shapes a
response. It contains no rules. Every rule already exists in `src/lib/*.util.ts`, tested, and shared with the
Discord surface — see `06-COMMAND-CONTROL.md`.

## Dev vs production topology

**Development** — two processes, no CORS:

```
localhost:5174   Vite dev server (HMR)
    │ proxy /api → localhost:3000
localhost:3000   bot + API
```

`vite.config.ts` gets `server.proxy = { "/api": "http://localhost:3000" }`. Because the browser only ever talks
to 5174, requests are same-origin and cookies just work. No CORS configuration in development at all, which
removes the single most common "why am I getting 401" question from self-hosters.

**Production** — one process, one origin:

```
localhost:3000   bot + API + static files from dashboard/dist
```

`npm run build` builds the bot to `dist/` and the SPA to `dashboard/dist`. The API serves that directory, with an
SPA fallback so `/guilds/123/levelling` returns `index.html` and React Router takes it from there. Same origin
means: no CORS, no `SameSite=None`, no third-party cookie problems, and one URL to put behind a reverse proxy.

Set `Cache-Control: max-age=31536000, immutable` on Vite's hashed assets and `no-cache` on `index.html`.

## New collections

Two, both with TTL or bounded growth, both guild-scoped where relevant.

**`dashboardSession`** — `{ _id, userId, isOwner, csrfSecret, accessToken, refreshToken, tokenExpiresAt, createdAt, lastSeenAt, userAgentHash, expiresAt }` with a TTL index on `expiresAt`. Server-side sessions rather than
JWTs because revocation has to be instant: the moment you notice something wrong, deleting the document ends the
session, which a signed stateless token cannot offer.

**`dashboardAudit`** — `{ _id, actorId, actorTag, guildId, action, summary, before?, after?, at }` with an index on
`{ guildId, at: -1 }`. Every mutation writes one. It is a security control (who turned levelling off) and a UX
feature (a "recent changes" card on the guild overview). Cap it — a TTL of 90 days, or a `capped` collection —
so it cannot grow without bound on a busy bot.

Per `CLAUDE.md` §13: one collection per shape, both carry `guildId` where they are guild data, and both get a
repository in `src/database/repositories/` rather than being queried from a route.
