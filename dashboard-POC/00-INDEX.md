# Testify Dashboard — proof-of-concept plan

A web dashboard for Testify, with two audiences: the **bot owner**, who controls everything, and a **server
manager**, who controls their own guild and nothing else.

This directory is a plan, not code. Nothing here has been built. Read `01-SCOPE.md` first, then whichever
document covers the part you are working on.

---

## The documents

| File                                                 | What it settles                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| [`01-SCOPE.md`](01-SCOPE.md)                         | Who it is for, what it does, what it deliberately does not do         |
| [`02-ARCHITECTURE.md`](02-ARCHITECTURE.md)           | Where the API lives, repository layout, how a request reaches Mongo   |
| [`03-AUTH.md`](03-AUTH.md)                           | Discord OAuth2 end to end, sessions, cookies, CSRF, the threat model  |
| [`04-PERMISSIONS.md`](04-PERMISSIONS.md)             | The two roles, how each is proven on every request                    |
| [`05-API.md`](05-API.md)                             | Every endpoint, its shape, its errors                                 |
| [`06-COMMAND-CONTROL.md`](06-COMMAND-CONTROL.md)     | How the dashboard drives the bot without faking Discord interactions  |
| [`07-FRONTEND.md`](07-FRONTEND.md)                   | Vite + React + TS structure, routing, data fetching, forms            |
| [`08-DESIGN.md`](08-DESIGN.md)                       | The black/purple/white system, with measured contrast ratios          |
| [`09-UX-JOURNEYS.md`](09-UX-JOURNEYS.md)             | Every screen, the journeys through them, and their empty/error states |
| [`10-ACCESSIBILITY.md`](10-ACCESSIBILITY.md)         | WCAG 2.2 AA target, what that means concretely, how it is checked     |
| [`11-TESTING.md`](11-TESTING.md)                     | Jest + React Testing Library + MSW, and what is worth testing         |
| [`12-SETUP.md`](12-SETUP.md)                         | Local setup, environment variables, build, deploy, self-hosting       |
| [`13-ROADMAP-AND-RISKS.md`](13-ROADMAP-AND-RISKS.md) | Phases with acceptance criteria, risks, open questions                |

---

## The decisions, at a glance

Each of these is argued where it is made; this table is so you can disagree early rather than after reading
thirteen files.

| Decision                                                                      | Where                   |
| ----------------------------------------------------------------------------- | ----------------------- |
| The API runs **inside the bot process**, not as a separate service            | `02-ARCHITECTURE.md`    |
| **Hono** for the HTTP layer, with Fastify as the named alternative            | `02-ARCHITECTURE.md`    |
| npm **workspaces**: one `npm ci` installs bot and dashboard                   | `02-ARCHITECTURE.md`    |
| Production serves the built SPA **from the bot's own origin** — no CORS       | `02-ARCHITECTURE.md`    |
| OAuth2 **authorization code** flow; the client secret never reaches a browser | `03-AUTH.md`            |
| Sessions are **server-side documents** + an httpOnly cookie, not JWTs         | `03-AUTH.md`            |
| Guild permissions are **re-verified live on every request**, never trusted    | `04-PERMISSIONS.md`     |
| The dashboard drives the **domain layer**, it is not a command runner         | `06-COMMAND-CONTROL.md` |
| **`/eval` is not exposed.** An HTTP eval endpoint is a remote shell           | `06-COMMAND-CONTROL.md` |
| Zod schemas are **shared** between the API and the forms                      | `07-FRONTEND.md`        |
| Dark theme is the canonical one; light mode is optional and later             | `08-DESIGN.md`          |
| Every mutation writes a **dashboard audit record**                            | `05-API.md`             |
| The dashboard is **off by default** so the bot still starts without it        | `12-SETUP.md`           |

---

## What is assumed about the bot

Written against the bot as it stands on `claude/testify-bot-typescript-rewrite-f35fmu`:

- discord.js v14, Mongoose, Node ≥ 24.11, CommonJS output via `tsup`.
- 76 commands in 12 categories; one command object serves both the slash and prefix surfaces.
- 9 Mongoose schemas with 9 repositories in front of them. **Commands never touch a model directly** — which is
  exactly why an API can reuse them.
- `src/config/env.ts` is the only file that reads `process.env`, zod-validated once at startup.
- No inbound HTTP server exists yet. `src/lib/http.util.ts` is outbound only.
- Conventions in [`../CLAUDE.md`](../CLAUDE.md) apply to any dashboard code that lands in `src/`.

The single most important thing this plan leans on: **the bot's repositories and `*Actions.util.ts` modules are
already surface-agnostic.** They take a `guildId`, a `userId` and plain data. They do not know what an
interaction is. That is what makes a dashboard an afternoon of wiring per feature rather than a rewrite.
