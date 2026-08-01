# 13. Roadmap and risks

## Phases

Each phase ends with something demonstrable, `npm run check` green, and no half-finished screen behind a feature
flag. Estimates assume one person working in evenings; halve them for full days.

### Phase 0 — Foundations (~1 week) — **done**

Nothing user-visible. Get the plumbing right or every later phase pays for it.

- npm workspaces; `shared/` with zod schemas and `permissions.ts`.
- Hono server in `src/api/`, started after login, closed in the existing shutdown path, with `runRoute` catching
  everything so a route bug cannot kill the bot.
- `dashboardSession` and `dashboardAudit` schemas plus repositories.
- Vite app that renders "hello" and proxies `/api` in development.
- Jest + RTL + MSW wired into the root `npm test`, one passing test each side.
- CI builds both.

**Done when:** `npm run dev:all` gives a React page calling `/api/health` through the proxy, and `npm run check`
passes for both projects.

Two things this phase found that were not in the plan, both recorded in `CLAUDE.md` §24:

- **`@testify/shared` cannot be a `tsconfig.json` path.** `tsc-alias` rewrites every alias in that map to a
  relative path inside `dist/`, and nothing outside `src/` is emitted there — it resolved the package to
  `dist/index.js`, the bot's own entry point. So the workspace ships a real build and resolves like any other
  package, while TypeScript, Jest and Vite all read its source.
- **Jest with MSW needs three pieces of configuration**, none of them guessable: `jest-fixed-jsdom`, a
  `transformIgnorePatterns` allowlist for MSW's ESM-only dependencies, and a React pin, because
  `discord-html-transcripts` puts React 18 in the root `node_modules`.
- **Vite needs the same React pin, and the browser is where it bites.** The hoisted React 18 also captures
  `@tanstack/react-query` and `react-router`, which then run their hooks against a different React than the one
  rendering — a blank page and `Cannot read properties of null (reading 'useEffect')`. `resolve.dedupe` and
  explicit aliases fix it; `npm run verify:bundle` fails the build if a second copy ever returns.

### Phase 1 — Sign in and guild picker (~1 week) — **done**

The riskiest part, so it comes early.

- Full OAuth2 flow with `state` + PKCE, sessions, cookies, CSRF middleware, rate limiting.
- `GET /api/auth/me` and the guild intersection.
- `requireGuild` and `requireOwner`, with the permission tests that prove they can fail.
- `/sign-in`, `/guilds`, `RequireAuth`, the app shell, the design tokens.
- The setup screen for a misconfigured install.

**Done when:** you sign in, see your manageable guilds, and a user without Manage Server gets 403 on their next
request after being demoted — verified live, not just in a test.

Built with the guild overview and the owner console alongside, since both are read-only and fall out of the same
middleware. What this phase turned up, beyond the plan:

- **`serveDashboard` has to be registered after every route.** It is a catch-all, so anything behind it never
  runs — which showed up as routes returning 404 rather than as anything failing loudly.
- **The SPA's path cannot be resolved through `assetPath`.** That lands inside `dist/` after a build, so the
  built bot looked for `dist/dashboard/dist` and served a 404 for every page. Nothing but a real HTTP request
  caught it; there is a test pinning it now.

### Phase 2 — Guild overview and levelling (~1½ weeks) — **done**

The vertical slice that proves the architecture. Levelling first because it is the freshest, richest config and
its rules already live in `src/lib/levelling.util.ts`.

- `/overview`, `/channels`, `/roles` with `canSend` and `assignableByBot`.
- Full levelling routes and page: four tabs, role and channel pickers, hierarchy warnings at configuration time.
- Optimistic updates with rollback; the audit log written and shown on the overview.
- `jest-axe` clean; the manual keyboard pass done.

**Done when:** levelling can be configured end to end from the browser and the change is visible in
`/levelling edit` in Discord.

`jest-axe` is wired in now (see `10-ACCESSIBILITY.md`); the live check against a running bot is still
outstanding, as this sandbox has neither Discord nor a MongoDB binary. What this phase settled:

- **`LEVEL_LIMITS` had to move into `@testify/shared`.** The plan had the shared schemas importing it from
  `src/lib/`, which inverts the dependency — `shared/` is consumed by the browser and cannot reach into the bot.
  It lives in shared now and `levelling.util.ts` re-exports it, so every existing caller is unchanged.
- **Hono does pass a mount-path parameter into a sub-app.** Worth recording because the opposite looked true for
  a while: a 404 during this phase was a trailing slash in a test URL, not the router.

### Phase 3 — The rest of the settings (~2 weeks) — **in progress**

Repetitive by design — phase 2 built the pattern, this applies it. **Welcome is done** and is the worked example
for the rest: `WELCOME_LIMITS`, the placeholders and `fillTemplate` moved into `@testify/shared`, so the
dashboard's live preview fills the template with the same function the bot posts with, and the API reuses
`normaliseWelcome` rather than reimplementing the migration off the old `isEmbed` flag.

Two shapes worth copying from it:

- **A typed field is not a toggle.** Every other control writes on change; the message template is held in local
  state and saved on blur or on an explicit Save, with Discard beside it. Saving per keystroke would be a write
  per character.
- **"Off" can be the absence of a record.** The welcome document is deleted rather than flagged, so the API
  turns that into `enabled: false` plus the defaults a form needs to render — a 404 would make the screen
  unbuildable.

**Audit logging is done** too, and is the other half of the pattern: where welcome writes per control, this one
holds a draft and writes once, mirroring the panel's Save button. Three things it settled:

- **The event list, its labels and the `all` shorthand moved into `@testify/shared`.** They were declared in
  `src/lib/auditLog.util.ts` and again inside `auditPanel.util.ts`; a third copy in the browser would have been
  the moment the two surfaces started disagreeing about which events a guild logs. `src/lib/` re-exports, so no
  caller changed.
- **`all` has to survive a round trip.** The API expands it for the checklist and collapses a full selection back
  on save, because storing eighteen names would freeze the guild at today's list rather than opting it into
  events added later. The dashboard says so on screen when everything is ticked.
- **Mounting a sub-app is the step that fails silently**, and a request cannot detect it: `requireGuild` refuses
  an anonymous caller before the router decides there is no handler, so a missing `guilds.route(…)` line looks
  exactly like a permission refusal. `tests/api/server.test.ts` reads Hono's route table instead, and that test
  was proved able to fail.

**Prefix, anti-link, roles on join, counting and voice stats are done** as well, and they answered a question
the plan left open: whether every setting needs its own screen. They do not. Five small independent switches on
one **Server settings** page read better than five sidebar entries, and each still has its own endpoint — so a
refusal in one section leaves the other four alone. Two details worth copying:

- **A page of sections is not a page with one Save.** Each section writes on change, because each is an
  independent decision. The one typed field on it, the prefix, is held locally and saved on blur, exactly as the
  welcome template is.
- **Every write answers with the whole settings document.** One response keeps the page consistent, so a section
  that refuses cannot leave the rest of the screen showing a value the bot does not have.

Still to do: automod, sticky, treasure, verification, tickets and lottery — extracting any logic still living
inside a command `run()` into `*Actions.util.ts` as you go (`06-COMMAND-CONTROL.md`).

**Done when:** every guild-scoped setting the bot has is editable on the web.

### Phase 4 — Members, moderation, economy (~1½ weeks)

- Leaderboards as accessible tables; member detail page.
- Warnings, softbans, unban through `moderationActions.util.ts`, with the actor-hierarchy checks added there.
- XP grants and level sets that also apply role rewards.
- Destructive actions behind typed-name confirmation.

**Done when:** a manager can handle a problem member without opening Discord.

### Phase 5 — Owner console (~1 week) — **partly done**

- Stats, guild table, leave guild, blacklist.
- The generated command runner over the allowlist.
- The error ring buffer, if you want `/owner/errors`.

**Done when:** you can answer "which of my servers is misconfigured" in one screen.

**Built:** the four-tab console — fleet stats and the guild table, command-usage analytics, the log feed and a
runtime card. **Still to do:** leave guild, blacklist and the command runner.

Open question 3 is answered: the ring buffer is worth it, and it turned out to be a pino `logMethod` hook
rather than a transport, which is a dozen lines. Three things it settled:

- **Usage had to be counted, not logged.** A row per invocation grows without bound; one row per command per
  server per day per surface, `$inc`-ed in place with a TTL, answers every question this console asks.
- **No user IDs are stored, and that is a decision rather than an omission.** A self-hoster's analytics turning
  into a per-person activity log is a much worse default than not being able to answer "who ran that".
- **The buffer redacts on the way in, not on the way out.** A dashboard page is easier to read over someone's
  shoulder than a terminal, and a line that was never stored with a connection string in it cannot leak one
  through a future endpoint.

### Phase 6 — Polish (~1 week)

- Full accessibility pass: screen reader, 200% zoom, reduced motion, greyscale. The automated half is done.
- Bundle budget check (<200 kB gzipped first load). **Measured at 152 kB** — vendor is 136 kB of it, and three
  is not in the first load at all.
- Docker image and compose file; README screenshots; `CONTRIBUTING.md` section.
- Light theme, if wanted — cheap now that everything is tokens, but re-verify every contrast ratio.

Roughly eight to nine weeks of evenings. Phases 0–2 are the ones that must not be rushed; 3 is mechanical.

## Risks

| Risk                                            | Likelihood | Impact | Mitigation                                                                                       |
| ----------------------------------------------- | :--------: | :----: | ------------------------------------------------------------------------------------------------ |
| A session leak becomes bot control              |    Low     | Severe | httpOnly + Secure + short TTL, `logout-all`, audit log, **no `/eval`** (`06-COMMAND-CONTROL.md`) |
| An API bug crashes the bot process              |   Medium   |  High  | `runRoute` catches everything; the API starts after login; no synchronous heavy work             |
| Permission check fails open on stale data       |    Low     | Severe | Live `members.fetch` per request; tests that are proven able to fail (`04-PERMISSIONS.md`)       |
| `guildId` read from a body instead of the path  |   Medium   | Severe | One middleware sets `c.get("guild")`; make it a review rule and a lint-able pattern              |
| Two sources of truth for config rules           |    High    | Medium | Shared zod schemas importing `LEVEL_LIMITS` etc. from `src/lib/` (`05-API.md`)                   |
| Scope creep from "control all commands"         |    High    | Medium | The allowlist, and the domain-layer principle instead of an interaction adapter                  |
| Self-hoster exposes the dashboard on plain HTTP |   Medium   |  High  | Off by default, bind to localhost, checklist in the README, `Secure` cookies fail loudly         |
| Bundle bloat                                    |   Medium   |  Low   | Lazy routes, per-icon imports, a stated budget, no chart library                                 |
| Accessibility left to the end                   |   Medium   | Medium | `jest-axe` in CI from phase 1; a manual pass is an exit criterion for every phase                |
| Discord changes OAuth or rate limits            |    Low     | Medium | Standard flow, no undocumented endpoints, version-pinned API path (`/api/v10`)                   |
| Dashboard and Discord panels drift apart        |   Medium   | Medium | Both call the same repositories and the same `*.util.ts` rules                                   |
| Mongo bloat from sessions and audit records     |    Low     |  Low   | TTL index on sessions; capped or TTL'd audit collection                                          |
| Maintenance burden doubles                      |   Medium   | Medium | Accept it. A dashboard is a second product; it is why phases 0–2 build a repeatable pattern      |

## Open questions

Worth deciding before phase 2, because each changes work later.

1. **Moderator-level access.** The POC has two roles. Do you want a third — a per-guild allowlist of roles that
   grant dashboard access without Manage Server? It needs its own storage and its own UI, and it undermines the
   "no second permission system" rule from `04-PERMISSIONS.md`. Recommendation: not in the POC; revisit with real
   demand.
2. **Public or private.** Is this dashboard only for your bot instance, or does every self-hoster run their own?
   The plan assumes the latter, which is what makes "off by default" and the localhost bind correct. A hosted
   multi-tenant deployment would need per-instance secrets and a very different threat model.
3. **The error ring buffer.** It is new bot code (a pino transport or wrapper) and it is the difference between
   "someone says it broke" and "here is the stack". Phase 5, or earlier if support load justifies it.
4. **Kick and ban.** Deliberately excluded (`05-API.md`). Softban covers the reversible case. If you want them,
   they need a stronger confirmation than typing a name.
5. **Light theme.** Phase 6 or never. Cheap to add, but every contrast ratio in `08-DESIGN.md` needs recomputing
   against a light background, and an unverified light theme is worse than none.
6. **Realtime.** Everything here is request/response. Live member counts or a live audit feed would want SSE
   (simpler than WebSockets, and one-directional is all this needs). Not in the POC; the polling in TanStack
   Query is enough.

## What would make this fail

Named plainly, because each has killed a project like this before:

- **Building the UI before the permission layer.** It is much harder to retrofit `requireGuild` into fifteen
  routes than to write it once in phase 1.
- **Exposing `/eval` "just for now".** It never comes back out, and the entire security posture depends on not
  doing it.
- **Letting the dashboard own logic.** The moment a validation rule exists only in a route handler, the two
  surfaces disagree, and every bug after that lives in the seam.
- **Treating accessibility as a phase.** It is 20% more work done continuously and 200% more work done at the
  end.
- **Shipping a dashboard that needs a second service.** The value proposition for a self-hosted bot is "one
  process, one command". Losing that loses the audience.
