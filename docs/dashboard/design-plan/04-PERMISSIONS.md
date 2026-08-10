# 4. Permissions

Two roles, and nothing in between. Adding a third ("moderator access") is what turns a weekend project into a
permission system nobody trusts, so it is explicitly out of scope for the POC (`01-SCOPE.md`).

## The two roles

### Bot owner

**Proven by:** `env.DISCORD_OWNER_IDS.includes(session.userId)`, evaluated **per request**, not read off the
session document.

**Can:** everything a server manager can, in every guild the bot is in, plus the owner console — guild list,
leave guild, blacklist, bot-wide counters, recent errors, the command runner.

The bot already has exactly one source of truth for this (`DISCORD_OWNER_IDS`, `CLAUDE.md` §14) and the dashboard
must not introduce a second. No `isAdmin` flag in Mongo, no allowlist collection. Editing the env and restarting
is the entire administration story, and it is the right one for a self-hosted bot.

### Server manager

**Proven by:** the user holds `ManageGuild` in that specific guild, **and** the bot is in that guild.

**Can:** everything scoped to that guild, and nothing outside it.

Why `ManageGuild` and not `Administrator`: it is the permission Discord itself gates "server settings" behind, it
is what every other bot dashboard uses, and it is what the bot's own settings commands already require
(`permissions: [PermissionFlagsBits.ManageGuild]` on `/levelling`, `/audit-logging`, `/welcome-system` and the
rest). The dashboard matching the commands means one mental model, not two.

## How a guild request is authorised

This middleware is the security boundary. Everything else assumes it ran.

```ts
// src/api/middleware/requireGuild.ts  — shape, not final code
export const requireGuild = createMiddleware(async (c, next) => {
	const session = c.get("session"); // set by the session middleware
	const guildId = c.req.param("guildId");

	if (!/^\d{17,20}$/.test(guildId)) return c.json(error("bad_guild_id"), 400);

	// 1. The bot has to be in it. If it is not, there is nothing to configure.
	const guild = c.get("client").guilds.cache.get(guildId);
	if (!guild) return c.json(error("guild_not_found"), 404);

	// 2. Owners skip the member check — they may not even be in the guild.
	const isOwner = c.get("env").DISCORD_OWNER_IDS.includes(session.userId);

	if (!isOwner) {
		// 3. Fetch the member LIVE. Not the OAuth guilds list, not a cache of it.
		const member = await guild.members.fetch(session.userId).catch(() => null);
		if (!member) return c.json(error("not_a_member"), 403);
		if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return c.json(error("missing_manage_guild"), 403);
		}
		c.set("member", member);
	}

	c.set("guild", guild);
	c.set("isOwner", isOwner);
	await next();
});
```

Five things in there are load-bearing:

1. **The guild id comes from the path parameter only.** Never from a request body, never from a header. A body
   field is attacker-controlled; a path param is too, but it is the one thing this middleware validates before
   anything else runs. Handlers must use `c.get("guild").id`, not `body.guildId`. Make that a review rule — it is
   the single most likely way this dashboard leaks one guild's data into another's.

2. **`guild.members.fetch()` is live, every request.** The OAuth `guilds` payload is a login-time snapshot
   (`03-AUTH.md`). Someone demoted five minutes ago still has it in their session. Fetching the member costs one
   cached lookup or one REST call and is the difference between "loses access on their next click" and "loses
   access next time they log in". A dashboard that fails open on stale permissions is not a dashboard you can put
   in front of other people's servers.

3. **404 before 403.** If the bot is not in the guild, say so — that is not a secret, and "the bot is not here,
   here is an invite link" is the correct UX. But **403 for a guild the bot is in and the user cannot manage**
   must not leak the guild's name or icon. The error body carries a code, nothing else.

4. **Owners bypass the member fetch entirely.** The owner may not be in the guild at all, and requiring them to
   join before they can support someone would be absurd.

5. **`.catch(() => null)`** on the fetch: an unknown member throws, and an unhandled throw here would be a 500
   that looks like a bug rather than a 403 that looks like a denial.

## The permission logic worth extracting

Put the decision itself in `shared/src/permissions.ts` as a pure function so it can be tested exhaustively and
reused by the frontend for _rendering_ (not for gating):

```ts
export type Access = "owner" | "manager" | "member" | "stranger";

export function accessFor(input: {
	userId: string;
	ownerIds: readonly string[];
	botInGuild: boolean;
	isMember: boolean;
	hasManageGuild: boolean;
}): Access;
```

The frontend uses it to decide whether to _show_ the owner console link. The backend uses it to decide whether to
_serve_ the owner console. **The frontend's answer is a hint; the backend's is the gate.** Never the other way
round, and never only the frontend — hiding a button is not access control.

## What each role sees

| Area                               | Owner | Manager | Notes                                                                                  |
| ---------------------------------- | :---: | :-----: | -------------------------------------------------------------------------------------- |
| Guild picker                       |  All  | Theirs  | Manager's list comes from the OAuth `guilds` payload, filtered to guilds the bot is in |
| Guild overview                     |   ✓   |    ✓    |                                                                                        |
| Levelling / audit / welcome / etc. |   ✓   |    ✓    | Every guild-scoped setting                                                             |
| Leaderboards, member lookup        |   ✓   |    ✓    |                                                                                        |
| Warn / softban / unban             |   ✓   |    ✓    | Still subject to Discord's own role hierarchy                                          |
| Reset a member's economy           |   ✓   |    ✓    | Confirmation dialog, typed guild name                                                  |
| Wipe the guild's economy or levels |   ✓   |    ✓    | Confirmation dialog, typed guild name                                                  |
| Leave the guild                    |   ✓   |    ✗    | Owner only — a manager doing this is not recoverable from the dashboard                |
| Guild list across all servers      |   ✓   |    ✗    |                                                                                        |
| Blacklist                          |   ✓   |    ✗    | Global by design (`CLAUDE.md` §12)                                                     |
| Bot-wide counters, recent errors   |   ✓   |    ✗    |                                                                                        |
| Command runner                     |   ✓   |    ✗    | `06-COMMAND-CONTROL.md`                                                                |
| `/eval`                            |   ✗   |    ✗    | Not exposed to anyone                                                                  |

## Discord's hierarchy still applies

The dashboard cannot grant powers the bot does not have. A manager pressing "ban" on someone above the bot in the
role list gets the same failure the slash command gets, and the API must surface it as a clear message rather
than a 500. `applyLevelRewards` in `src/lib/levellingActions.util.ts` is the model: check `role.position` against
`me.roles.highest.position`, check `role.managed`, report what was skipped rather than throwing.

Two rules the API adds on top, which the Discord commands get for free from Discord itself:

- **A manager cannot act on someone with a higher role than themselves.** In Discord, the client stops them. Over
  HTTP, nothing does, so the moderation endpoints must compare `actor.roles.highest.position` against
  `target.roles.highest.position` and refuse. Without this, a manager with the lowest possible Manage Server role
  could ban the guild owner through the dashboard.
- **Nobody can act on the guild owner.** Special-case `guild.ownerId`.

Both belong in `src/lib/moderationActions.util.ts` next to the existing logic, so the Discord surface gets them
too — the same "one implementation, every surface" rule the bot is built on.

## Rate limiting

Per session, and per IP for the unauthenticated routes:

| Route class              | Limit               | Why                                                    |
| ------------------------ | ------------------- | ------------------------------------------------------ |
| `GET /api/auth/login`    | 10 / 5 min / IP     | Stops session-document spam                            |
| `GET /api/auth/callback` | 20 / 5 min / IP     |                                                        |
| Any authenticated `GET`  | 120 / min / session | Generous — the SPA polls a little                      |
| Any mutating verb        | 30 / min / session  | Config edits are deliberate, human-paced actions       |
| Moderation actions       | 10 / min / session  | Also protects against burning Discord's own rate limit |
| Command runner           | 5 / min / session   | Owner only, but the blast radius is large              |

In-memory is fine for one process — that is the topology (`02-ARCHITECTURE.md`). Key on the session id, fall back
to the IP for anonymous routes, and take the IP from a configurable trusted-proxy header rather than assuming
`x-forwarded-for` is honest.

## Testing this

The permission layer is where tests earn their keep, and all of it is testable without a browser:

- `accessFor` — exhaustive table test over the input combinations.
- `requireGuild` — bot not in guild → 404; member fetch fails → 403; has `ManageGuild` → passes; owner not in
  guild → passes; a guild id from the body being ignored in favour of the path.
- Hierarchy — manager below target → 403; target is guild owner → 403; bot below target → a clear 409, not a 500.
- **A test that proves the gate can fail.** Per `CLAUDE.md` §17: temporarily grant the wrong user access and watch
  the test go red. A permission test that passes vacuously is worse than no test.
