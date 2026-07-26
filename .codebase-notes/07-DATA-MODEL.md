# 07 — Data Model (all 32 Mongoose schemas)

`src/schemas/` holds 32 files, 503 lines. Every one follows the same shape: `require('mongoose')` →
`new Schema({...})` → `module.exports = model(name, schema)`.

There is **no connection module, no model registry, and no repository layer.** Command and event files
`require` schema modules directly and hand-write queries inline.

---

## 1. Schema catalogue

Field names below are given exactly as declared — the inconsistent casing is the point.

| # | File | Model name | Key fields | Feature area |
|---|---|---|---|---|
| 1 | `aiChannelSystem.js` | `SetupChannel` | `serverID, channelID, instruction` | `/ai` chat channel; also gates both triggers |
| 2 | `antiLinkSystem.js` | `links` | `Guild, Perms` | Anti-link automod |
| 3 | `auditLoggingSystem.js` | `AuditLogs` | `Guild, Channel, EnabledLogs: [String] = ["all"]` | Audit logging |
| 4 | `autoRoleSystem.js` | `autoRoles1742` | `GuildID, Roles: Array` | Auto-role on join |
| 5 | `blacklistSystem.js` | `blacklist` | `userId, reason` | Global blacklist — checked by **both** dispatchers |
| 6 | `countingSystem.js` | `countingSchema` | `Guild, Channel, Count, MaxCount` | Counting game |
| 7 | `dmLoggerSystem.js` | `DmLogger` | `messageId (unique), authorId, content, timestamp, hasAttachments, attachmentsData` | DM logging |
| 8 | **`economySchema.js`** | `Economy` | **27 fields** — `Guild, User, Bank, Wallet, Worked, Gambled, Begged, DailyStreak, LastDaily, HoursWorked, LastWorked, CommandsRan, Moderated, Inventory[], Job="Unemployed", JobLevel, House{}, Businesses[], Robbery*/Heist* counters, Pet{id,name,type,emoji,happiness=100,hunger=100,purchasedAt,lastFed,lastWalked}` | **The** economy — ~43 consumers |
| 9 | **`economySystem.js`** | `economy` | `Guild, User, Bank, Wallet, Worked, Gambled, Begged, HoursWorked, CommandsRan, Moderated` | **LEGACY DUPLICATE of #8** — see §2 |
| 10 | `fixedBotsStatsSystem.js` | `guildChannelSchema` | `User, Channel, Guild, MessageId` | Auto-updating stats message |
| 11 | `giveawaySystem.js` | `giveaways_x` | ~30 fields, several `SchemaTypes.Mixed`, `{ id: false }` | `discord-giveaways` persistence |
| 12 | `instaNotificationSystem.js` | `InstagramNotifications` | `Guild, Channel, InstagramUsers: [String], LastPostDates: Map<Date>` | Instagram notifications |
| 13 | `levelSetupSystem.js` | `levelsetup` | `Guild, Disabled, Role, Multi, LevelUpChannel` | Levelling config — **`Disabled` and `Multi` are `String`**, not `Boolean`/`Number` |
| 14 | `lotterySchema.js` | `Lottery` | `Guild, Active, Frozen, EntryFee, PrizePool, BasePrizePool, MaxWinners, Frequency(enum), NextDrawTime, AnnouncementChannelId, CreatedBy, Entries[{UserId,UserTag,Tickets,EnteredAt}], History[{DrawTime,TotalPrizePool,Winners[]}]` | Lottery + draw job |
| 15 | `prefixEnableSystem.js` | `prefixSetupSchema` | `Guild, Prefix, Enabled = true` | Prefix on/off |
| 16 | `prefixSystem.js` | `prefix` | `Guild, Prefix` (default from `config`) | Per-guild prefix — **the only schema that imports `config.js`** |
| 17 | `profileSystem.js` | `Profile` | `userId (unique), favoriteSong, about, birthday, hobbies, favoriteGame, createdAt` | Profiles |
| 18 | `softbanSystem.js` | `SoftbanEntry` | `guildId, userId, moderatorId, reason, expiresAt, createdAt, isActive, deleteMessageSeconds` + **compound index `{guildId,userId,isActive}`** | Temporary bans — **the only indexed schema** |
| 19 | `spotifyTrackerSystem.js` | `SpotifyUser` | `discordId (unique), spotifyAccessToken, spotifyRefreshToken, tokenExpiry` | Spotify OAuth — **plaintext tokens** |
| 20 | `stickyMessageSystem.js` | `stickyschema` | `Guild, Message, Channel, Count, Cap` | Sticky messages |
| 21 | `ticketSetupSystem.js` | `TicketSetup` | `GuildID, Channel, Category, Transcripts, Handlers, Everyone, Description, Button, Emoji` | Ticket panel config |
| 22 | `ticketSystem.js` | `Ticket` | `GuildID, OwnerID, MembersID[], TicketID, ChannelID, Locked, Claimed, ClaimedBy` | Individual tickets |
| 23 | `treasureConfigSchema.js` | `TreasureConfig` | `Guild (unique), Enabled, MinMessages=15, MaxMessages=50, MinAmount=10, MaxAmount=500, Cooldown=300000, CreatedBy, CreatedAt, LastModifiedBy, LastModifiedAt` | Random money drops |
| 24 | `userLevelSystem.js` | `UserLevel` | `Guild, User, XP, Level, Background, BarColor, BorderColor, Blur` | XP/levels + rank-card styling |
| 25 | `valorantUserSystem.js` | `ValorantUser` | `userId, accessToken, entitlementToken, userUUID, expires` | Valorant store — **plaintext Riot tokens** |
| 26 | `verifyLeftUsersSystem.js` | `leftusers` | `Guild, Key, User, Left` | **DEAD — zero consumers repo-wide** |
| 27 | `verifySystem.js` | `verify` | `Guild, Channel, Role, Message, Verified: Array` | Captcha verification |
| 28 | `verifyUsersSystem.js` | `verifyusers` | `Guild, Key, User` | Pending verification keys |
| 29 | `voiceChannelBotSystem.js` | `botVoiceChannels` | `Guild, BotChannel` | Bot-count VC stat |
| 30 | `voiceChannelMembersSystem.js` | `voiceChannelSchema` | `Guild, TotalChannel` | Member-count VC stat |
| 31 | `warningSystem.js` | `warnTutorial` | `GuildID, UserID, UserTag, Content[{ExecuterId, ExecuterTag, Reason, WarnID, Timestamp, Edits[{...}]}]` | Warnings + edit history |
| 32 | `welcomeSystem.js` | `WelcomeMessage` | `guildId, channelId, message, isEmbed` | Welcome messages |

---

## 2. CRITICAL — two models over the same collection

`economySchema.js` declares `model('Economy', …)` and `economySystem.js` declares `model('economy', …)`.
Mongoose pluralises both to the **same MongoDB collection: `economies`**.

They have **different shapes**:

- `economySchema` (#8) — 27 fields, the full modern economy: inventory, pets, houses, businesses, jobs, streaks.
- `economySystem` (#9) — 10 fields, the original economy: balances and counters only.

**Consumers are split:**

| Model | Used by |
|---|---|
| `economySchema` | all 19 `src/commands/Economy/*` files and the prefix economy commands — ~43 sites |
| `economySystem` | `src/commands/LevelAndEconomy/give.js`, `leaderboard.js`, `reset.js` |

Because Mongoose applies its own schema when hydrating a document, **reading a full economy document through the
legacy model drops the 17 fields it does not declare, and saving it back can strip them from the database.**
`/give currency` and `/reset` write through the legacy model against documents that the Economy commands wrote
through the modern one.

**This is the single highest-priority data bug in the codebase.** Fix it *before* the TypeScript rewrite, not
during: migrate the three `LevelAndEconomy` files to `economySchema` and delete `economySystem.js`. Verify against
a database copy that no documents have been truncated.

---

## 3. Schema-layer smells

### 3.1 Four naming conventions for the same concept
- Guild key: **`Guild`** (18 schemas), **`GuildID`** (3), **`guildId`** (3), **`serverID`** (1)
- User key: **`User`**, **`UserID`**, **`userId`**, **`OwnerID`**, **`discordId`**, **`authorId`**

A typed data layer should normalise on one convention (`guildId` / `userId`) with a documented migration.

### 3.2 Model names leak implementation history
`autoRoles1742`, `warnTutorial`, `giveaways_x`, `links`, `countingSchema`, `stickyschema`,
`guildChannelSchema`, `voiceChannelSchema`. Several are the *variable* name rather than a domain name.
**Renaming a Mongoose model renames the collection**, so any rename needs a data migration — document the
mapping and do it deliberately or not at all.

### 3.3 Almost nothing is required or indexed
- **19 of 32 schemas declare zero `required` fields and zero defaults.** In TypeScript every field becomes
  optional, and every `findOne()` result is `T | null` with all-optional members — the type system will
  correctly surface how little is guaranteed.
- **Exactly one index exists in 32 schemas** (the softban compound index). `economySchema` is queried by
  `{ Guild, User }` from ~43 call sites with **no compound index** — a full collection scan per economy command.

### 3.4 No timestamps, hand-rolled instead
No schema uses `{ timestamps: true }`. Six hand-roll `CreatedAt` / `LastModifiedAt` fields instead.

### 3.5 Two import idioms
`const { model, Schema } = require('mongoose')` in 17 files; `const mongoose = require('mongoose')` in 15.
15 files use `let` for the schema constant.

---

## 4. Access patterns — the real performance story

### 4.1 No repository layer
~43 files `require('../../schemas/economySchema')` and hand-write
`findOne({ Guild: interaction.guild.id, User: interaction.user.id })`, each followed by a near-identical
"you don't have an account yet" guard embed. **This one query is duplicated ~18 times verbatim in
`src/commands/Economy/` alone.**

### 4.2 Read-modify-`save()` everywhere → lost updates
The universal pattern is `findOne()` → mutate the document → `await doc.save()`. There are no atomic
`$inc` / `findOneAndUpdate` operations. Under concurrency this loses writes:

- Two `/gamble` calls interleaving can credit both winnings against the same starting balance.
- `heist` payouts and `lotteryDrawJob` credit multiple users in a loop with the same pattern.
- **This is exploitable as money duplication**, not merely a theoretical race.

**Rewrite action:** every balance mutation becomes an atomic `findOneAndUpdate` with `$inc`, and the lottery draw
takes a guard so a slow draw cannot overlap the next tick.

### 4.3 No `.lean()`
Only `src/utils/giveaway.js` uses `.lean()`. Every other read hydrates a full Mongoose document — with change
tracking, getters and setters — even for read-only embed rendering.

### 4.4 The hot path: up to 7 uncached queries per message
Every single `messageCreate` in every guild triggers:

| Source | Queries |
|---|---|
| `src/utils/getMessagePrefix.js` | 2 (`prefixEnableSystem.findOne`, then `prefixSystem.findOne`) |
| `src/events/SlashAndPrefixCreateEvents/messageCreate.js` | 1 |
| `src/triggers/mentionBot.js` | 2 (`aiChannelSystem`, `prefixSystem`) |
| `src/triggers/sendBotName.js` | 2 (`aiChannelSystem`, `prefixSystem`) |

…**before** the levelling, counting, anti-link, sticky-message and AI-channel events do their own lookups on the
same message. Nothing is cached.

**Rewrite action:** an in-memory guild-settings cache (per-guild prefix, enabled features) invalidated on write,
plus merging the two triggers into one handler. This alone removes 6 of the 7 queries.

### 4.5 Connection management
- `mongoose.connect` is called in **`src/events/ReadyEvents/ready.js`** with three options that are no-ops or
  removed in Mongoose 6+ (`keepAlive`, `useNewUrlParser`, `useUnifiedTopology`).
- A **second, independent** `mongoose.connect` lives in `src/scripts/wipeDatabase.js`.
- `src/utils/folderLoader.js` contains `if (mongoose.connect)` — testing a **function reference**, which is
  always truthy, so it reports "connected to database successfully" regardless of actual connection state.
- There is no connection-state guard anywhere: if Mongo drops, commands run and fail with raw Mongoose errors.

---

## 5. Target design for the rewrite

```ts
// src/database/connection.ts — ONE connect, with retry, health state and graceful shutdown
export async function connectDatabase(uri: string): Promise<typeof mongoose>

// src/database/models/economy.ts — interface + typed model, colocated
export interface IEconomy {
  guildId: string;
  userId: string;
  bank: number;
  wallet: number;
  inventory: InventoryItem[];
  pet?: Pet;
  // …
}
const economySchema = new Schema<IEconomy>({ /* … */ }, { timestamps: true });
economySchema.index({ guildId: 1, userId: 1 }, { unique: true });
export const Economy = model<IEconomy>('Economy', economySchema);

// src/database/repositories/economyRepository.ts — the ~43 duplicated lookups collapse to this
export async function getOrCreateAccount(guildId: string, userId: string): Promise<IEconomy>
export async function adjustWallet(guildId: string, userId: string, delta: number): Promise<IEconomy>  // atomic $inc
```

### Checklist
- [ ] Delete `economySystem.js` after migrating its 3 consumers (§2). **Do this first.**
- [ ] Delete `verifyLeftUsersSystem.js` (zero consumers).
- [ ] One connection module; drop the removed Mongoose options; add health checks and graceful shutdown.
- [ ] `interface I<Name>` + `Schema<I<Name>>` + `model<I<Name>>` for all 30 surviving schemas.
- [ ] Add the `{ guildId, userId }` compound index to the economy collection, and indexes for every other
      documented query shape.
- [ ] `{ timestamps: true }` everywhere; retire the hand-rolled `CreatedAt`/`LastModifiedAt` fields.
- [ ] Replace every read-modify-`save()` on a balance with an atomic update (§4.2).
- [ ] Add `.lean()` to all read-only queries.
- [ ] Introduce the guild-settings cache to kill the per-message query storm (§4.4).
- [ ] Encrypt the Spotify and Riot token fields (schemas #19, #25).
- [ ] Decide on field-name normalisation (§3.1) and write the migration script if you go ahead.
