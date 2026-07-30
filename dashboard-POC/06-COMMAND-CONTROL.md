# 6. Controlling the bot's commands

You asked for the dashboard to "control all commands on the bot". This document is about the fact that there are
two very different ways to read that, and only one of them survives contact with the codebase.

## The tempting approach, and why it is mostly wrong

The bot's defining decision is that **one command object serves both the slash and the prefix surface**
(`CLAUDE.md` §1). `src/core/prefix.ts` is a `PrefixInteraction` class implementing the `CommandInput` contract,
so `t?ban` runs the same `run()` body as `/ban`.

So the obvious move is a third implementation — `DashboardInteraction implements CommandInput` — and suddenly
every one of the 76 commands is available over HTTP for free.

It genuinely works for a subset. It falls apart for the rest, and the failures are not edge cases:

| What a command does            | Over HTTP                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reply({ embeds: [...] })`     | You get an `EmbedBuilder`. Renderable as a card, with effort.                                                                                                             |
| `reply(containerMessage(...))` | A Components V2 tree with buttons that post back to Discord's interaction endpoint. Meaningless in a browser.                                                             |
| `interaction.showModal(...)`   | No modal exists. The flow simply stops.                                                                                                                                   |
| Autocomplete                   | A separate Discord round trip that has no web equivalent.                                                                                                                 |
| `deferReply()` then edit       | Two responses to one HTTP request.                                                                                                                                        |
| Button handlers                | The entire panel layer — `/shop`, `/levelling`, `/audit-logging`, `/balance`, `/inventory` — is buttons. The command only opens the panel; the work is in `src/buttons/`. |

That last row is decisive. On this bot, the most useful things are **panels**, and a panel's command body is two
lines that render a screen. Running `/levelling setup` through an adapter gets you a JSON dump of a Discord
component tree, not a working settings page.

## The right approach: promote the domain layer

The dashboard is a third surface onto the same **domain**, not onto the same _presentation_.

```
                      ┌─ src/commands/**        (slash + prefix)
Domain layer  ────────┼─ src/buttons/**         (Discord panels)
repositories +        └─ src/api/routes/**      (the dashboard)     ← new
*Actions.util.ts
```

This works because the bot is already built this way. `CLAUDE.md` §13 forbids commands from touching a model
directly, so every write already goes through a repository that takes `(guildId, userId, data)` and knows
nothing about interactions. And the `*Actions.util.ts` convention already exists for logic shared between a
command and a button — `economyActions.util.ts`, `moderationActions.util.ts`, `levellingActions.util.ts`. The
dashboard is just another caller.

**Concretely, per feature:**

1. Is the logic already in a repository or an action module? Then the route is four lines. Levelling, audit
   logging, welcome, prefix, counting, treasure, automod and the rest are all in this bucket today.
2. Is it still inside a command's `run()` body? Extract it into `src/lib/<feature>Actions.util.ts`, have the
   command call it, and have the route call it. The command gets shorter and gains a unit test; the dashboard
   gets the feature. This is the same de-duplication the rewrite exists for, applied once more.
3. Does it only make sense inside Discord (`/say`, `/impersonate`, `/flush-logs`)? Do not expose it.

The work is incremental and each step leaves the bot better. There is no big-bang refactor, and no feature is
blocked on the adapter being perfect.

## Where the adapter _is_ right: the owner command runner

For owner-only operations you asked for specifically, a curated runner is genuinely useful and the objections
above mostly do not apply — owner commands tend to be one-shot and embed-based.

**`GET /api/owner/commands`** returns the registry the bot already has. `client.commands` holds every `Command`
object with its `name`, `description`, `category`, `options` (name, type, required, choices, min/max) and
`subcommands`. That is the same metadata `buildSlashCommand` uses to register with Discord, so the dashboard can
**generate a form per command with zero per-command frontend work** — a string option becomes a text input, an
integer with min/max becomes a number input, a `choices` array becomes a select, a `user` option becomes a member
picker. This is the part that makes the runner worth building.

**`POST /api/owner/commands/:name`** runs it through the adapter:

```ts
class DashboardInteraction implements CommandInput {
	// Captures instead of sending.
	readonly captured: InteractionReplyOptions[] = [];
	async reply(options) {
		this.captured.push(options);
	}
	async editReply(options) {
		this.captured.push(options);
	}
	async deferReply() {
		/* no-op */
	}
	async showModal() {
		throw new UnsupportedInDashboard("showModal");
	}
	// options.getString(name) reads from the JSON body, validated against the
	// command's own declared options before run() is ever called.
}
```

Then serialise `captured` for the browser: an `EmbedBuilder` becomes `{ title, description, fields, colour }` and
renders as a card; a Components V2 container renders its text parts and drops its buttons with a note saying
"this command's controls only work in Discord". Honest degradation, not a broken imitation.

**An allowlist, not everything.** `ALLOWED_IN_DASHBOARD: readonly string[]` next to the registry, and a command
not on it returns 403. Start with: `guild-list`, `blacklist`, `bot`, `ping`, `member-count`, `server-info`,
`user-info`, `role-info`, `permissions`. Add more as each is verified to render sensibly. Opting in beats opting
out, because a new command added six months from now must not become web-reachable by accident.

**Every run is audit-logged** with the command name and the arguments given.

## `/eval` is not exposed

Flatly. Not behind a confirmation, not behind a second password.

`src/commands/owner/eval.command.ts` evaluates arbitrary JavaScript inside the bot process. In Discord it is
reachable only by an account that has already passed Discord's own login, 2FA and session security, and the
audit trail is a message in a channel. Over HTTP it becomes: **anyone who obtains one session cookie gets a shell
on your server**, with your bot token, your database credentials and your filesystem. Every other mitigation in
`03-AUTH.md` exists to make session theft hard; this one endpoint would make session theft total.

If you truly want it later, the bar is: a separate env flag defaulting to off, a distinct re-authentication step
with a value not stored in the session, an IP allowlist, full request/response audit logging, and a written
acknowledgement in the setup docs that enabling it makes the dashboard a remote code execution surface. That is a
lot of machinery to reach a feature you can already use in Discord in two seconds. The recommendation is: don't.

`/dm` deserves a similar look. Sending a direct message as the bot to any user is a spam and impersonation vector
if a session leaks. If it is exposed at all, rate limit it hard (a handful per hour), audit every one, and never
allow it in bulk.

## Summary of what runs where

| Feature area                                   | How the dashboard reaches it            |
| ---------------------------------------------- | --------------------------------------- |
| All guild settings (levelling, audit, …)       | Repositories directly                   |
| Moderation (warn, softban, unban)              | `moderationActions.util.ts`             |
| Economy grants, resets, item use               | `economyActions.util.ts`                |
| XP grants and level sets                       | `levellingActions.util.ts`              |
| Leaderboards, member lookup                    | Repositories directly                   |
| Blacklist, guild list, leave guild             | Repository + `client` directly          |
| Owner one-shot commands                        | Allowlisted, via `DashboardInteraction` |
| Panels (`/shop`, `/inventory`, …)              | Rebuilt as native web UI — not proxied  |
| `/eval`, `/say`, `/impersonate`, `/flush-logs` | Not exposed                             |

## The rule to hold onto

**If the dashboard needs logic, it goes in `src/lib/` where Discord can use it too.** No rule lives only in a
route handler. The moment "how many boost roles are allowed" has one answer in `levelling.util.ts` and another in
an API validator, the two surfaces have started to drift, and every bug after that is a bug in the seam.
