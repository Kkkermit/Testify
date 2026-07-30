# 5. API contract

REST over JSON, all under `/api`. Every request and response shape is a zod schema in `@testify/shared`, so the
server validates with the same definition the form validates with (`02-ARCHITECTURE.md`).

## Conventions

- **Path params carry authority.** `:guildId` is validated and authorised by middleware before any handler runs.
  A handler reads `c.get("guild").id`, never a guild id from the body (`04-PERMISSIONS.md`).
- **Verbs.** `GET` reads and never mutates. `PATCH` for partial config updates. `PUT` for whole-resource
  replacement (a list of boosts). `POST` for actions with side effects. `DELETE` removes.
- **Errors** are always the same shape, with a machine-readable code and a message safe to show a user:
  ```json
  { "error": { "code": "missing_manage_guild", "message": "You need Manage Server in this guild." } }
  ```
  Validation failures add `"issues"` — zod's `error.issues` flattened to `{ path, message }` so the form can put
  each message on the right field.
- **Status codes.** 400 malformed, 401 no/expired session, 403 authenticated but not allowed, 404 not found or
  bot not in guild, 409 Discord refused (role hierarchy, missing bot permission), 429 rate limited, 500 bug.
- **`UserFacingError` maps to 400** with its message verbatim — the bot already distinguishes "the user did
  something wrong" from "this is a bug" (`CLAUDE.md` §16), and that distinction is exactly what an HTTP status
  code is for. Anything else becomes a 500 with a generic message and a logged stack.
- **Snowflakes are strings.** Always. A Discord ID does not survive `JSON.parse` as a number.
- **Every mutation writes a `dashboardAudit` record** before responding.

## Auth

| Method | Path                   | Who     | Notes                                                  |
| ------ | ---------------------- | ------- | ------------------------------------------------------ |
| GET    | `/api/auth/login`      | anyone  | 302 to Discord. `?returnTo=` must be a relative path   |
| GET    | `/api/auth/callback`   | anyone  | 302 back to the SPA, sets cookies                      |
| POST   | `/api/auth/logout`     | session | Deletes this session                                   |
| POST   | `/api/auth/logout-all` | session | Deletes every session for this user — the panic button |
| GET    | `/api/auth/me`         | session | `{ user, isOwner, guilds: ManageableGuild[] }`         |

`GET /api/auth/me` is the SPA's bootstrap call. It returns 401 when there is no session, which is the signal to
render the sign-in screen rather than an error. `guilds` is the intersection of the user's OAuth guild list and
the guilds the bot is in, each with `{ id, name, icon, memberCount, botPresent: true }` — so the picker can also
show _unconfigurable_ guilds with an "Invite Testify" button, which is a real conversion path and costs nothing.

## Guild

All under `/api/guilds/:guildId`, all behind `requireGuild`.

| Method | Path        | Returns                                                                        |
| ------ | ----------- | ------------------------------------------------------------------------------ |
| GET    | `/overview` | Counts, which features are on, the bot's own missing permissions, recent audit |
| GET    | `/channels` | `{ id, name, type, canSend }[]` — text and announcement only                   |
| GET    | `/roles`    | `{ id, name, colour, position, managed, assignableByBot }[]`                   |
| GET    | `/audit`    | Dashboard audit records, paged                                                 |

`canSend` and `assignableByBot` are computed server-side from the live client. This is the single biggest reason
the API lives in the bot process: the frontend can grey out a channel the bot cannot post in **before** someone
saves a broken configuration, rather than showing an error afterwards. Same for a role above the bot in the
hierarchy — the level-reward picker can disable it with a tooltip saying why.

## Settings

One route group per feature, each mirroring an existing repository. Levelling in full, as the template:

| Method | Path                 | Body / returns                                                          |
| ------ | -------------------- | ----------------------------------------------------------------------- |
| GET    | `/levelling`         | `LevelConfig` — literally `normaliseSettings(await getLevelSettings())` |
| PATCH  | `/levelling`         | `Partial<{ enabled, announce, levelUpChannelId, stackRewards }>`        |
| PUT    | `/levelling/boosts`  | `{ roleId, multiplier }[]` — max 5, multiplier 1–5                      |
| PUT    | `/levelling/rewards` | `{ level, roleId }[]` — max 10, level 1–500                             |
| PUT    | `/levelling/ignores` | `{ channelIds, roleIds }`                                               |
| DELETE | `/levelling`         | Clears the config. Earned XP untouched — say so in the response         |

`GET /levelling` returning the output of `normaliseSettings` is the point. The migration from the old
single-`roleId` shape, the `"current"` channel sentinel, the clamping — all of it already happens in
`src/lib/levelling.util.ts` and the API inherits it for free. If the dashboard reimplemented that normalisation
it would drift, and a guild would see different settings on the web than in `/levelling edit`.

`PUT` for the lists rather than add/remove endpoints, because the UI is a multi-select whose value _is_ the whole
list — the same reasoning that made the panel's role menus pre-ticked (`CLAUDE.md` §11). One request, no
add-then-remove race.

The same shape repeats for: `/audit-logging`, `/welcome`, `/anti-link`, `/automod`, `/counting`, `/sticky`,
`/prefix`, `/treasure`, `/voice-stats`, `/verification`, `/tickets`, `/lottery`. Each is a thin wrapper over the
matching functions in `settingsRepository.ts` — there are already 36 of them, and they all take a `guildId` first.

**Validate against the same limits the panels use.** `LEVEL_LIMITS` is exported from `src/lib/levelling.util.ts`;
the zod schema in `shared/` imports those numbers rather than repeating `max(5)`. Two sources of truth for "how
many boost roles" is how the web UI ends up accepting a sixth that the panel then cannot render.

## Members, economy, levelling data

| Method | Path                         | Notes                                                    |
| ------ | ---------------------------- | -------------------------------------------------------- |
| GET    | `/members/:userId`           | Discord profile + economy account + level + warnings     |
| GET    | `/leaderboard/economy?page=` | Same data the canvas board draws, as JSON                |
| GET    | `/leaderboard/levels?page=`  |                                                          |
| POST   | `/members/:userId/xp`        | `{ amount }` — grants XP, then applies role rewards      |
| POST   | `/members/:userId/level`     | `{ level }` — sets a level, then applies role rewards    |
| DELETE | `/members/:userId/economy`   | Wipes one account                                        |
| DELETE | `/economy`                   | Wipes the guild's economy. Requires a typed confirmation |
| DELETE | `/levels`                    | Wipes the guild's levels                                 |

`POST /members/:userId/xp` must call `applyLevelRewards` afterwards, exactly as the message handler does. If it
does not, granting XP through the dashboard silently skips the role rewards and the two surfaces disagree — which
is precisely the class of bug `06-COMMAND-CONTROL.md` exists to prevent.

The leaderboard endpoints return JSON rather than the PNG. The web UI renders an HTML table: it is accessible, it
is selectable text, it is responsive, and the canvas card is a solution to _Discord's_ lack of layout, not the
web's. Rendering a PNG here would be copying a workaround into a place that does not have the problem.

## Moderation

| Method | Path                              | Notes                            |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/moderation/warnings?userId=`    | Paged                            |
| POST   | `/moderation/warnings`            | `{ userId, reason }`             |
| DELETE | `/moderation/warnings/:warningId` |                                  |
| POST   | `/moderation/softban`             | `{ userId, reason, durationMs }` |
| DELETE | `/moderation/softban/:userId`     |                                  |
| POST   | `/moderation/unban`               | `{ userId, reason }`             |

Every one goes through `src/lib/moderationActions.util.ts` so the audit-log embed, the DM to the member, and the
warning record all still happen. The hierarchy checks from `04-PERMISSIONS.md` live there too.

Deliberately **not** here: kick and ban. They are irreversible, they are one mis-click, and Discord's own UI does
them well. Softban (temporary, reversible, and Testify-specific) is the one worth exposing. Revisit after the
POC if it is genuinely missed.

## Owner

Behind `requireOwner`, which checks `env.DISCORD_OWNER_IDS` per request.

| Method | Path                           | Notes                                                          |
| ------ | ------------------------------ | -------------------------------------------------------------- |
| GET    | `/api/owner/stats`             | Guilds, users, uptime, memory, command counts, DB status       |
| GET    | `/api/owner/guilds?page=`      | Every guild: name, members, owner, joined date, features on    |
| POST   | `/api/owner/guilds/:id/leave`  | Typed-name confirmation                                        |
| GET    | `/api/owner/blacklist`         |                                                                |
| POST   | `/api/owner/blacklist`         | `{ userId, reason }`                                           |
| DELETE | `/api/owner/blacklist/:userId` |                                                                |
| GET    | `/api/owner/errors`            | Recent logged errors, if a ring buffer is added to the logger  |
| GET    | `/api/owner/commands`          | The command registry, for the runner (`06-COMMAND-CONTROL.md`) |
| POST   | `/api/owner/commands/:name`    | Runs an allowlisted command                                    |

`GET /api/owner/errors` needs something that does not exist yet: a bounded in-memory ring buffer of the last N
`logger.error` calls. It is ~30 lines as a pino transport or a wrapper, and it turns "a user says it broke" into
"here is the stack". Worth doing, but it is new bot code, so it belongs in a phase of its own.

## Health

| Method | Path          | Who    | Returns                                                     |
| ------ | ------------- | ------ | ----------------------------------------------------------- |
| GET    | `/api/health` | anyone | `{ ok, uptimeMs, discord: "ready"\|"reconnecting", db: … }` |

No authentication, no detail beyond that — it exists for a reverse proxy or an uptime monitor. Do not add guild
counts to it; an unauthenticated endpoint that reports how many servers you are in is an information leak with no
upside.

## The audit record

```ts
{
  actorId:  "1234…",           // the dashboard user
  actorTag: "kkkermit",
  guildId:  "9876…" | null,    // null for owner-scope actions
  action:   "levelling.boosts.update",
  summary:  "Set 2 boost roles",
  before:   { boosts: [ … ] },  // trimmed, never a whole document
  after:    { boosts: [ … ] },
  at:       Date
}
```

`before`/`after` are for the diff view on the guild overview — "someone turned levelling off at 14:02" is the
question this answers. Keep them small: store the field that changed, not the whole config, or the collection
outgrows the data it describes.

Write the record **after** the change succeeds, not before, so a failed write does not leave a lie in the log.
If the audit write itself fails, log it and still return success — the user's change did happen, and failing the
request would be worse.
