# 02 — Module Contracts (as they exist today)

The four module shapes every file in `src/commands`, `src/prefix`, `src/events` and `src/triggers` must
conform to. These are **discovered contracts** — nothing enforces them, so this page also records where files
deviate.

---

## 1. Slash command — `src/commands/<Category>/<name>.js`

Loaded by `src/functions/handleCommands.js`, dispatched by
`src/events/SlashAndPrefixCreateEvents/interactionCreate.js`.

All 103 files use `module.exports = { … }` with keys in a consistent order:

```js
module.exports = {
    usableInDms: false,                          // 103/103 — REQUIRED, no default
    category: "Moderation",                      // 103/103 — REQUIRED, free-form string
    permissions: [PermissionFlagsBits.BanMembers], // 41/103 — optional
    underDevelopment: true,                      // 1/103 — AiCommands/aiCommands.js only
    data: new SlashCommandBuilder() …,           // 100 builders / 3 ContextMenuCommandBuilder
    async execute(interaction, client) { … },    // 103/103 — REQUIRED
    async autocomplete(interaction, client) { … },// 3/103 — clashRoyale, dbd, valorantCommands
}
```

**There is no `cooldown`, `devOnly`, `ownerOnly`, `guildOnly`, `nsfw`, `aliases` or `usage` field anywhere in
`src/commands/`.** Owner-gating is done *inside* `execute` by comparing against `client.config.developers`.

### Full example — `src/commands/Other/testCommand.js` (the minimal form)

```js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    usableInDms: true,
    category: "Community",
    data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test command'),
    async execute(interaction, client) {

        const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setDescription(`Test command successful | ${client.user.username} is online!`)

        await interaction.reply({ content: `<@${interaction.user.id}>` , embeds: [embed]})
    }
}
```

### Deviations from the contract

| Deviation | Files |
|---|---|
| `execute(interaction)` — no `client` param | `Fun/nitro.js`, `LightModeration/createEmbedThread.js`, `HardModeration/warn.js` |
| `execute(interaction, client, err)` — a third param the dispatcher never passes | `LightModeration/voiceChannelStats.js` |
| `async execute (interaction, client)` — space before paren | 10 files |
| `permissions` using `PermissionsBitField.Flags.X` instead of `PermissionFlagsBits.X` | `LevelAndEconomy/reset.js` |
| **`permissions: [PermissionsBitField.Administrator]` — property does not exist → `undefined`** | `Owner/guildList.js` — **live bug**, see `04-AUDIT-FINDINGS.md` |
| **`permissions: [PermissionFlagsBits.createWebhook]` — wrong casing → `undefined`** | `Community/impersonate.js` — **live bug** |
| `category` does not match the folder | 9 files (`Counting/`→`"Fun"`, `Valorant/`→`"Community"`, `Profile/`→`"Community"`, `Other/`→`"Community"`, `Automod/`→`"Moderation"`, `AuditLogging/`,`Tickets/`,`Verification/`→`"Server Utils"`) |

20 distinct `category` strings are in use. `src/utils/helpCommandUtils.js` maintains a hand-written 19-entry
category→emoji map that must be kept in sync manually; it declares `"Utility"`, `"Settings"` and `"Games"`,
which **no command uses**.

---

## 2. Prefix command — `src/prefix/<Category>/<name>.js`

Loaded by `src/functions/handlePrefix.js`, dispatched by
`src/events/SlashAndPrefixCreateEvents/messageCreate.js`.

```js
module.exports = {
    name: 'kick',                                 // REQUIRED — loader skips the file without it
    aliases: ['boot'],                            // 62/67
    description: 'Kick a user from the server',   // 67/67
    usage: 'kick <user> [reason]',                // 66/67
    category: 'Moderation',                       // 67/67 — free-form, NOT derived from folder
    usableInDms: false,                           // 67/67
    permissions: [PermissionFlagsBits.KickMembers], // 9/67
    inVoiceChannel: true,                         // 18/67 — all Music
    async execute(message, client, args) { … },   // REQUIRED — note the argument ORDER
}
```

### Full example — `src/prefix/Music/skip.js`

```js
const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'skip',
  inVoiceChannel: true,
  description: 'Skip the current song',
  usage: 'skip',
  category: 'Music',
  usableInDms: false,
  async execute(message, client, args) {
    const queue = client.distube.getQueue(message)

    const embed = new EmbedBuilder()
      .setColor(client.config.embedMusic)
      .setDescription(`${client.config.musicEmojiError} | There is **nothing** in the queue right now!`)

    if (!queue) return message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral })
    try {
      const song = await queue.skip()
```

### Fields the dispatcher reads that no file declares — dead branches

- `command.args` — checked in `messageCreate.js`; **0/67 files declare it**
- `command.underDevelopment` — checked in `underDevelopmentCheck.js`; **0/67 prefix files declare it**
- `command.subcommands` — read by `helpCommandUtils.js`; **0/67 files declare it**

`inVoiceChannel` is declared by 18 Music files but is read **only** by
`src/events/CommandEvents/musicPrefixHandleEvent.js`, which is itself broken (it resolves the prefix from the
global `config.prefix` rather than the guild prefix, so it silently no-ops in any guild with a custom prefix).

---

## 3. Event — `src/events/<Folder>/<file>.js`

Loaded by `src/functions/handleEvents.js`:

```js
if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
else            client.on(event.name,   (...args) => event.execute(...args, client));
```

```js
module.exports = {
    name: Events.ClientReady,   // discord.js event name — Events.* enum, or a raw string in 4 files
    once: true,                 // optional, default false
    async execute(...payload, client) { … },   // client is ALWAYS the trailing argument
}
```

### The client is appended last — arity varies per event type

| Event | Correct signature | Notes |
|---|---|---|
| `ClientReady` | `execute(client)` | The payload *is* the client, so it arrives twice |
| `InteractionCreate` | `execute(interaction, client)` | 25 files |
| `MessageCreate` | `execute(message, client)` | 9 files |
| `GuildMemberAdd`/`Remove` | `execute(member, client)` | 7 files |
| `GuildCreate`/`Delete` | `execute(guild, client)` | 3 files |

### Full example — `src/events/ClientEvents/checkSoftbans.js`

```js
const { Events } = require('discord.js');
const SoftbanEntry = require('../../schemas/softbanSystem');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        client.logs.info('[SOFTBAN] Starting softban check system');

        if (!client.modPanels) {
            client.modPanels = new Map();
            client.logs.info('[MOD_PANEL] Initialized moderation panels cache from softban checker');
        }
        …
```

### Contract violations — three files whose signature is wrong

| File | Declared | Effect |
|---|---|---|
| `events/CommandEvents/createDefaultPrefixEvent.js` | `execute(guild, message)` | The loader passes `(guild, client)`, so `message` is the Client; the guard `if (!message.guild \|\| message.author.bot) return` **always returns**. **This event has never run.** |
| `events/CommandEvents/guildMemberAddEvent.js` | `execute(member, message)` | Same defect — **the canvas welcome-card feature never executes.** |
| `events/FixedBotStatsEvents/fixedBotStatsEvent.js` | `execute(interaction, client)` for `ClientReady` | Works by accident: the first param is the client and the loader appends it again. |
| `events/VcMemberAndBotCountEvents/*` (4 files) | `execute(member, client, err)` | `err` is never passed, so `.catch(err)` is `.catch(undefined)` — **no handler**, producing unhandled rejections on channel-rename rate limits. |

### `handleLogsEvent.js` is not an event module

`src/events/CommandEvents/handleLogsEvent.js` (752 lines) exports `{ handleLogs }` — no `name`, no `execute`.
Because it lives under `src/events/`, the loader still requires it and calls
`client.on(undefined, …)`, registering a permanently dead listener. It works only because `src/index.js`
separately requires and calls `handleLogs(client)` after login. **Move it out of `src/events/`.**

---

## 4. Trigger — `src/triggers/<file>.js`

Identical contract to events, loaded by `src/functions/handleTriggers.js`. Both existing trigger files declare
`execute(message, client, interaction)` where **`interaction` is always `undefined`** — a dead parameter.

`src/triggers/mentionBot.js` and `src/triggers/sendBotName.js` are **~95% identical**: the same info embed and
the same two link-button rows, differing only in the match condition and the title.

---

## 5. Argument-order asymmetry — the landmine

Three different conventions coexist:

| Layer | Signature | Client position |
|---|---|---|
| Events | `execute(...payload, client)` | **last** |
| Slash commands | `execute(interaction, client)` | **second** |
| Prefix commands | `execute(message, client, args)` | **second**, args third |

The prefix order is the surprising one — the near-universal community convention is
`execute(message, args, client)`. Anyone contributing a prefix command from memory will get it backwards, and
because nothing is typed, the mistake surfaces only at runtime.

**Rewrite action:** normalise on one shape. A single context object is the cleanest option:

```ts
execute(ctx: { client: TestifyClient; interaction: ChatInputCommandInteraction }): Promise<void>
execute(ctx: { client: TestifyClient; message: Message; args: string[] }): Promise<void>
```

---

## 6. `client` augmentation — 20 ad-hoc properties

Nothing about these is typed today. Every one needs to appear in a
`declare module 'discord.js' { interface Client { … } }` block.

| Property | Assigned at | Reads | Notes |
|---|---|---|---|
| `client.config` | `index.js` | ~976 | The most-used symbol in the codebase |
| `client.logs` | `index.js`, `processHandlers.js` | ~192 | |
| `client.commands` | `index.js` | 22 | `Collection<string, SlashCommand>` |
| `client.pcommands` | `index.js` | 23 | `Collection<string, PrefixCommand>` |
| `client.aliases` | `index.js` | 7 | Shared by both loaders |
| `client.commandArray` | `handleCommands.js` | 3 | REST registration payload |
| `client.botStartTime` | `index.js` | 2 | |
| `client.reloadValoAPI` | `index.js` | 2 | |
| `client.swatch` / `skins` / `skinsTier` | `index.js`, `fetchValorantApi.js` | 15 | `null` at boot — dereferenced without guards |
| `client.distube` | `distubeClientEvent.js` | 27 | |
| `client.giveawayManager` | `giveawayClientEvent.js` | 10 | |
| `client.handleCommands` / `handleEvents` / `handleTriggers` / `prefixCommands` | `functions/*` | 2 each | |
| **`client.activeHeists: Map`** | **2 sites** (`commands/Economy/heist.js`, `prefix/Economy/heist.js`) | 24 | Lazily created in both |
| **`client.blackjackGames: Map`** | **2 sites** | 10 | Keyed by user ID only — one game per user **globally**, not per guild |
| **`client.modPanels: Map`** | **2 sites** | 23 | `checkSoftbans.js` **unconditionally overwrites it**, wiping active panels |
| **`client.helpData: object`** | **2 sites** | 10 | **A single global slot** — two users running `/help` in different guilds overwrite each other's state |
| `client.errorMessageInteraction` / `errorEmbedInteraction` / `errorRowInteraction` | `errorLogging.js` | 1 each | **Single global slot** — concurrent errors overwrite, so the error button edits the wrong message |

The last four rows are not merely untyped — they are **correctness bugs** that the type system will make
visible but not fix. See `04-AUDIT-FINDINGS.md`.

---

## 7. Component custom-ID conventions

There is **no central registry**. Every handler does ad-hoc `startsWith` / `===` matching inside its own
`execute`, using **three competing separators** (`_`, `-`, and mixed), across 27 concurrent `interactionCreate`
listeners.

Representative namespaces:

| Pattern | Separator | Owner |
|---|---|---|
| `modpanel_<panelId>_<modId>_<targetId>_<action>` | `_` | `ModPanelEvents/modPanelButtonHandler.js` |
| `shop_nav_*`, `shop_select_*`, `shop_buy_*_<id>` | `_` | `EconCommandEvents/shopInteractions.js` |
| `heist_<verb>_<heistId>` | `_` | `EconCommandEvents/heistHandler.js` |
| `help_category_select`, `help_page_*`, `switch_to_prefix_help` | `_` | `HelpCommandEvents/helpInteractions.js` |
| `guildlist-<action>-<userId>` | `-` | `InteractionEvents/guildListPaginationEvent.js` |
| `userinfo-<userId>`, `back-<…>` | `-` | `InteractionEvents/userInfoButtonEvent.js` |
| `spotify-<type>-<userId>-<timeRange>` | `-` | `CommandEvents/spotifyButtonEvent.js` |
| `ticket-close`/`-lock`/`-unlock`/`-manage`/`-claim` | `-` | `TicketEvents/ticketAction.js` |
| `skin-preview_<type>_<uuid>_<idx>` | **mixed** | `CommandEvents/valorantSkinInfo.js` |
| `minecraft-refresh_<ip>` | **mixed** | `CommandEvents/minecraftRefreshButtonEvent.js` |
| `verify`, `captchaenter`, `vermodal`, `refresh` | **none** | `verifyUsersEvent.js`, `prefix/InfoCommands/botInfo.js` |

**Known collisions** — see `04-AUDIT-FINDINGS.md` for detail:

1. `spotify-tracks` is claimed by **two** handlers (one exact-match, one `startsWith('spotify-')`), producing an
   `InteractionAlreadyReplied` crash.
2. `back-` is an unbounded land-grab — one handler claims every custom ID bot-wide beginning `back-`.
3. `verify` / `captchaenter` / `vermodal` / `refresh` are unnamespaced and will collide with future additions.
4. `TicketEvents/ticketResponse.js` matches **database-supplied strings**, so a guild admin can register a button
   ID that shadows any built-in ID.

**Rewrite action:** a typed custom-ID codec (`ns:action:...args`) with one separator, plus a
`Map<namespace, ComponentHandler>` router replacing the 27-listener fan-out. This is the single highest-leverage
structural change in the events layer.
