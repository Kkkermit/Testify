# 1. Scope

## Who this is for

**Persona A — the bot owner (you).** One of the IDs in `DISCORD_OWNER_IDS`. Wants to see every server the bot is
in, spot the one that is broken, manage the blacklist, read error reports, and reach owner-only operations
without opening Discord and typing. Cares about the bot as an operator.

**Persona B — a server manager.** Has **Manage Server** on one guild. Wants to configure Testify for that guild
without learning 76 commands: switch levelling on, pick which events get logged, set up welcome messages, look
at their leaderboard, deal with a warned member. May never have used a slash command panel. Cares about their
community, not about the bot.

These two want genuinely different screens, and the plan keeps them apart rather than showing Persona B a greyed
out version of the owner console.

**Persona C — a self-hoster.** Cloned the repo, wants the dashboard running in under ten minutes on a cheap VPS
without a second service, a Redis, or a paid tier. Everything in `12-SETUP.md` exists for this person.

## What it does

Ordered by how much value each unit of work returns.

1. **Sign in with Discord**, land on a list of the guilds you can manage.
2. **Guild overview** — is the bot healthy here: member count, channels, whether levelling / audit logging /
   welcome / automod / tickets are on, recent dashboard changes.
3. **Configuration editors** for every guild-scoped setting the bot has: levelling (boosts, role rewards, ignored
   channels and roles, announcements), audit logging, welcome, anti-link, automod, counting, sticky messages,
   prefix, treasure drops, voice counters, verification, tickets, lottery.
4. **Read-only views** of guild data: economy and level leaderboards, one member's economy account and level,
   warnings, softbans, open tickets, active giveaways.
5. **Moderation actions**: warn, remove a warning, softban, unban, reset a member's economy account. Every one
   audit-logged with the dashboard user's ID.
6. **Owner console**: every guild the bot is in, leave a guild, blacklist add/remove/list, bot-wide counters,
   recent errors, and a curated command runner (`06-COMMAND-CONTROL.md`).

## What it does not do

Saying no here is what keeps the thing shippable.

- **No `eval` over HTTP.** Argued in `06-COMMAND-CONTROL.md`. It turns a stolen cookie into a shell on your
  server.
- **No chat interface.** The dashboard does not read or send channel messages. That needs message-content intent
  and turns the dashboard into a Discord client, which Discord's client already is.
- **No multi-user accounts, teams, or invites.** Access derives from Discord permissions, always, with no second
  permission system to keep in sync. If someone loses Manage Server in Discord, they lose the dashboard the same
  second.
- **No analytics product.** Counters and leaderboards, yes. Time-series charts of message volume, no — that needs
  a metrics store the bot does not have.
- **No payment, premium tiers, or per-guild licensing.**
- **No mobile app.** The web UI is responsive; that is the whole mobile story.
- **No writes the bot cannot already do.** If there is no repository function for it, the dashboard does not get
  a bespoke Mongo query. Add it to the repository, where both surfaces can use it.

## Success criteria

The POC is done when all of these are true:

- A fresh clone, `npm ci`, `npm run setup`, `npm run dev` gets a working dashboard against a real bot token,
  with no step that says "now also install…".
- A server manager can turn levelling on, add a boost role and a level reward, and see it take effect in Discord —
  without touching a slash command.
- A server manager who loses Manage Server gets a 403 on their next request, not on their next login.
- The owner console lists every guild and can leave one.
- `npm run check` covers the dashboard: typecheck, lint, format, and Jest at the same 80/80/80/80 thresholds the
  bot holds.
- Every screen is reachable and operable with a keyboard alone, and `jest-axe` reports no violations on any of
  them.
- Every mutation appears in the dashboard audit log with the acting user, the guild, and what changed.

## Non-goals that people will ask for anyway

Write these down now so the answer is consistent later.

| Request                        | Answer                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------- |
| "Can it show live chat?"       | No — see above. Point them at Discord.                                        |
| "Can moderators get access?"   | Not in the POC. It would need a per-guild role model. Revisit after phase 5.  |
| "Can it run any command?"      | A curated allowlist, not everything. `06-COMMAND-CONTROL.md` explains why.    |
| "Can I theme it per guild?"    | No. One theme, done well, with a real contrast budget.                        |
| "Can it be a separate deploy?" | Possible but not supported. You lose the client cache — `02-ARCHITECTURE.md`. |
