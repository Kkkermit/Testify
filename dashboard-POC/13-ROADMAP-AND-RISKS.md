# 13. Roadmap and risks

## Phases

Each phase ends with something demonstrable, `npm run check` green, and no half-finished screen behind a feature
flag. Estimates assume one person working in evenings; halve them for full days.

### Phase 0 — Foundations (~1 week)

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

### Phase 1 — Sign in and guild picker (~1 week)

The riskiest part, so it comes early.

- Full OAuth2 flow with `state` + PKCE, sessions, cookies, CSRF middleware, rate limiting.
- `GET /api/auth/me` and the guild intersection.
- `requireGuild` and `requireOwner`, with the permission tests that prove they can fail.
- `/sign-in`, `/guilds`, `RequireAuth`, the app shell, the design tokens.
- The setup screen for a misconfigured install.

**Done when:** you sign in, see your manageable guilds, and a user without Manage Server gets 403 on their next
request after being demoted — verified live, not just in a test.

### Phase 2 — Guild overview and levelling (~1½ weeks)

The vertical slice that proves the architecture. Levelling first because it is the freshest, richest config and
its rules already live in `src/lib/levelling.util.ts`.

- `/overview`, `/channels`, `/roles` with `canSend` and `assignableByBot`.
- Full levelling routes and page: four tabs, role and channel pickers, hierarchy warnings at configuration time.
- Optimistic updates with rollback; the audit log written and shown on the overview.
- `jest-axe` clean; the manual keyboard pass done.

**Done when:** levelling can be configured end to end from the browser and the change is visible in
`/levelling edit` in Discord.

### Phase 3 — The rest of the settings (~2 weeks)

Repetitive by design — phase 2 built the pattern, this applies it.

- Audit logging (with its Save button and dirty state, mirroring the panel), welcome, anti-link, automod,
  counting, sticky, prefix, treasure, voice stats, verification, tickets, lottery.
- Extract any logic still living inside a command `run()` into `*Actions.util.ts` as you go
  (`06-COMMAND-CONTROL.md`).

**Done when:** every guild-scoped setting the bot has is editable on the web.

### Phase 4 — Members, moderation, economy (~1½ weeks)

- Leaderboards as accessible tables; member detail page.
- Warnings, softbans, unban through `moderationActions.util.ts`, with the actor-hierarchy checks added there.
- XP grants and level sets that also apply role rewards.
- Destructive actions behind typed-name confirmation.

**Done when:** a manager can handle a problem member without opening Discord.

### Phase 5 — Owner console (~1 week)

- Stats, guild table, leave guild, blacklist.
- The generated command runner over the allowlist.
- The error ring buffer, if you want `/owner/errors`.

**Done when:** you can answer "which of my servers is misconfigured" in one screen.

### Phase 6 — Polish (~1 week)

- Full accessibility pass: screen reader, 200% zoom, reduced motion, greyscale.
- Bundle budget check (<200 kB gzipped first load).
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
