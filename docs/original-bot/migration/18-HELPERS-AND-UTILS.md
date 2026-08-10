# 18 — Helpers & Utils Specification

The shared modules, with signatures. **Build these in Phase 2, before any feature work** — every one of them
replaces duplication that the audit counted, and if features are ported first they will re-derive their own
versions and the duplication survives the rewrite.

Each section states what it eliminates.

---

## Summary of what these replace

| Module | Eliminates | Count |
|---|---|---|
| `ui/embeds.ts` | Inline `EmbedBuilder` chains | **459 instantiations, ~90 files** |
| `ui/format.ts` | Inline duration maths, uptime, ordinals | ~20 sites + 3 duplicate implementations |
| `ui/pagination.ts` | Ad-hoc paginators, incl. regex-parsing embed footers | 3 implementations |
| `core/logger.ts` | Four parallel logging systems | 298 `console.*` + 192 `client.logs.*` |
| `core/errors.ts` | Ad-hoc `catch` blocks | 400 `catch` blocks |
| `core/middleware.ts` | Duplicated gate implementations | 4 functions × 2 surfaces |
| `core/customId.ts` | Three separator conventions, no registry | 30+ ID patterns |
| `core/contentFilter.ts` | Re-implemented profanity matching | **13 call sites** |
| `core/timers.ts` | Uncleared intervals | 6 timers, none cleared |
| `database/repositories/*` | Inline `findOne` + guard embeds | **~43 sites** |

---

## `ui/embeds.ts`

The single highest-value helper. ~90 command files hand-build the same six chained calls; `devBy` appears in
112 embed authors and `arrowEmoji` in 106 titles.

```ts
export interface EmbedOptions {
  category: Category;                 // drives the colour — no more client.config.embedXxx lookups
  title?: string;
  description?: string;
  fields?: APIEmbedField[];
  thumbnail?: string;
  image?: string;
  footer?: string;
  author?: { name: string; iconURL?: string };
  timestamp?: boolean;                // default true
}

export function embed(options: EmbedOptions): EmbedBuilder;

/** Red, ❌-prefixed. Use for every user-facing failure. */
export function errorEmbed(message: string): EmbedBuilder;
/** Green, ☑️-prefixed. */
export function successEmbed(message: string): EmbedBuilder;
export function warningEmbed(message: string): EmbedBuilder;
export function infoEmbed(message: string): EmbedBuilder;

/** Adds "Page 2 of 5" to the footer without clobbering existing footer text. */
export function withPageFooter(e: EmbedBuilder, page: number, total: number): EmbedBuilder;
```

```ts
// Before — repeated ~90 times            // After
new EmbedBuilder()                        embed({
  .setColor(client.config.embedEconomy)     category: Category.Economy,
  .setAuthor({ name: `Balance ${devBy}` })  title: 'Balance',
  .setTitle(`Balance ${arrowEmoji}`)        description: `Wallet: **${wallet}**`,
  .setTimestamp()                         })
  .setFooter({ text: 'Economy' })
```

**Do not add a parameter for every possible embed shape.** If a command needs something unusual, take the
builder back and chain onto it: `embed({ … }).setImage(url)`.

---

## `ui/format.ts`

```ts
/** "2h 5m 3s". Replaces ~20 inline `/ 3600000` sites. */
export function formatDuration(ms: number): string;
/** "2 hours, 5 minutes". For prose contexts. */
export function formatDurationLong(ms: number): string;
/** Time until a future timestamp; "ready now" when past. */
export function formatCooldown(until: Date | number): string;
/** Bot uptime — replaces 3+ copies of the same block. */
export function formatUptime(startedAt: number): string;

/** "1st", "2nd", "23rd" — from lib/addSuffix.js. */
export function ordinal(n: number): string;
/** "1,234,567" — locale-aware. */
export function formatNumber(n: number): string;
/** "1.2K", "3.4M" — for leaderboards. */
export function compactNumber(n: number): string;
/** Currency with the configured symbol. */
export function formatCurrency(amount: number): string;

/** Discord relative timestamp: <t:1234567890:R>. Prefer this over formatting client-side. */
export function relativeTime(date: Date | number): string;
export function truncate(text: string, max: number): string;
/** Escapes Discord markdown in user-supplied text — currently done nowhere. */
export function escapeMarkdown(text: string): string;
```

`relativeTime` is worth calling out: Discord renders `<t:…:R>` in each viewer's own locale and timezone and
keeps it live. Most of the hand-formatted durations in the current codebase should become this.

---

## `ui/pagination.ts`

Three ad-hoc paginators exist today. One recovers its state by **regex-parsing the embed footer**; another by
**fetching 10 surrounding channel messages and parsing a JSON blob out of one of them**.

```ts
export interface PaginationOptions<T> {
  items: T[];
  pageSize: number;
  namespace: Namespace;                                  // for custom-ID routing
  render(pageItems: T[], page: number, total: number): EmbedBuilder;
  ownerId?: string;                                      // only this user may paginate
}

/** Returns the first page plus its nav row. State lives in the custom ID — nothing is stored server-side. */
export function buildPage<T>(o: PaginationOptions<T>, page = 0): { embeds: EmbedBuilder[]; components: ActionRowBuilder[] };

/** Register once per feature; the router dispatches here. */
export function createPaginationHandler<T>(o: PaginationOptions<T>): ComponentHandler;
```

**State goes in the custom ID** (`inv:page:3:userId`). No module-scope `Map`, nothing to leak, and it survives
a restart — unlike today's `activeSessions` map, which also schedules a *new* 5-minute timeout on every button
press.

---

## `ui/components.ts`

```ts
export function button(o: { id: string; label: string; style?: ButtonStyle; emoji?: string; disabled?: boolean }): ButtonBuilder;
export function linkButton(label: string, url: string, emoji?: string): ButtonBuilder;
export function row(...components: MessageActionRowComponentBuilder[]): ActionRowBuilder;
export function confirmRow(namespace: Namespace, action: string, ...args: string[]): ActionRowBuilder;
export function navRow(namespace: Namespace, page: number, total: number, ownerId: string): ActionRowBuilder;
```

`button()` takes `ButtonStyle`, never a raw string — three sites currently pass `'1'`, `'3'`, `'4'`, which
will not type-check (finding 71).

---

## `core/logger.ts`

Replaces four systems: `client.logs.*`, raw `console.*` with hand-built ANSI, the webhook mirror, and
`discord-logs` debug output. `getTimestamp()` is currently defined **three times**.

```ts
export interface Logger {
  trace(obj: object, msg?: string): void;
  debug(obj: object, msg?: string): void;
  info (obj: object, msg?: string): void;
  warn (obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
  fatal(obj: object, msg?: string): void;
  child(bindings: object): Logger;      // e.g. logger.child({ feature: 'economy' })
}

export const logger: Logger;
export function createLogger(o: { level: LogLevel; webhookUrl?: string; filePath?: string }): Logger;
```

**Object first, message second** — this is the whole point:

```ts
logger.error({ err, commandName, userId, guildId }, 'Command failed');
```

Today `client.logs.error('msg', err)` **silently discards `err`**, because `write()` accepts one argument.
That has been swallowing stack traces at six or more confirmed call sites.

Transports: pretty console in development, JSON in production, plus an optional Discord webhook transport
(keep the current rate-limit queue with exponential backoff — it is the one genuinely good idea in
`consoleLogger.js`) and an optional **rotating** file. The current file transport does synchronous
`appendFileSync` on every line with no rotation.

**Never monkeypatch `console` or `process.stdout.write`.** The current logger patches both, so every message
is captured twice.

---

## `core/errors.ts`

```ts
export class UserFacingError extends Error {}                    // message shown verbatim
export class PermissionError extends UserFacingError {}
export class NotFoundError extends UserFacingError {}
export class ValidationError extends UserFacingError {}
export class CooldownError extends UserFacingError {
  constructor(public readonly retryAfterMs: number) { super(''); }
}
export class ExternalApiError extends Error {                    // logged, generic message shown
  constructor(public readonly service: string, public readonly cause: unknown) { super(''); }
}
export class ModuleLoadError extends Error {}                    // boot-time, names the file

/** Wraps every execute() on BOTH surfaces. */
export function withErrorBoundary(ctx: CommandContext, fn: () => Promise<void>): Promise<void>;
/** Posts the triage embed to the error channel. Buttons use the codec, not raw style strings. */
export function reportToErrorChannel(err: unknown, ctx: CommandContext): Promise<void>;
```

Today only the slash path reports errors — prefix errors are never logged to the error channel, and because
the prefix dispatcher does not `await` the command, they escape the `try/catch` entirely (finding 19).

---

## `core/middleware.ts`

The blacklist and permission gates are currently **character-for-character duplicates** across the two
dispatchers, and the DM/under-development checks exist as parallel `checkX`/`checkMessageX` pairs.

```ts
export type Middleware = (ctx: CommandContext, command: SharedCommand) => Promise<MiddlewareResult>;
export type MiddlewareResult = { ok: true } | { ok: false; reason: string; ephemeral?: boolean };

export const blacklistMiddleware: Middleware;
export const guildOnlyMiddleware: Middleware;        // replaces usableInDms; handles member === null (finding 22)
export const permissionMiddleware: Middleware;       // user perms
export const botPermissionMiddleware: Middleware;    // NEW — the bot's own perms are never checked today
export const cooldownMiddleware: Middleware;         // NEW — no cooldown system exists
export const ownerOnlyMiddleware: Middleware;        // replaces 6 inline comparisons, one using .includes()

export function runMiddleware(ctx, command, chain: Middleware[]): Promise<MiddlewareResult>;
```

One chain, both surfaces, short-circuiting on the first failure.

---

## `core/customId.ts`

See [`11-TYPED-CONTRACTS.md`](11-TYPED-CONTRACTS.md#5-components-and-the-custom-id-codec) for the full listing.

```ts
export function encodeId(ns: Namespace, action: string, ...args: string[]): string;  // throws over 100 chars
export function decodeId(raw: string): { ns: string; action: string; args: string[] };
export function isNamespace(value: string): value is Namespace;
```

One separator (`:`). Today there are three conventions, one unbounded `back-` land-grab, and a live
`spotify-*` double-claim.

---

## `core/contentFilter.ts`

The profanity list is matched at **13 call sites**, each with its own logic. One file even re-declares its own
copy of the filter message five times.

```ts
export function containsProfanity(text: string): boolean;
export function findProfanity(text: string): string[];
export function censor(text: string, replacement?: string): string;
```

Implement with a normalised `Set` lookup over tokenised input, not `Array.includes` on raw words — the current
approach misses casing and punctuation variants, and re-scans the list every call.

---

## `core/timers.ts`

Six intervals run today (7.5s presence, 60s lottery, 60s softban, 5min stats, 15min Instagram, 1h income).
**None are ever cleared**, and one uses self-rescheduling `setTimeout` recursion that cannot be cancelled.

```ts
export interface TimerRegistry {
  interval(name: string, ms: number, fn: () => Promise<void> | void): void;
  timeout(name: string, ms: number, fn: () => Promise<void> | void): void;
  /** Like interval(), but skips a tick if the previous run is still in flight. */
  guardedInterval(name: string, ms: number, fn: () => Promise<void>): void;
  clear(name: string): void;
  clearAll(): void;                    // called by shutdown
}
```

`guardedInterval` is what fixes the lottery double-payout (finding 15).

---

## `database/repositories/`

The economy account lookup is copy-pasted **~18 times verbatim** in `src/commands/Economy/` alone, and ~43
times codebase-wide, each followed by a near-identical "no account yet" guard embed.

```ts
// economyRepository.ts
export function getOrCreateAccount(guildId: string, userId: string): Promise<EconomyAccount>;
export function adjustWallet(guildId: string, userId: string, delta: number): Promise<EconomyAccount>;  // atomic
export function adjustBank(guildId: string, userId: string, delta: number): Promise<EconomyAccount>;    // atomic
export function transfer(guildId: string, from: string, to: string, amount: number): Promise<void>;     // atomic pair
export function getLeaderboard(guildId: string, limit: number): Promise<EconomyAccount[]>;
export function setCooldown(guildId: string, userId: string, key: CooldownKey, at: Date): Promise<void>;

// guildSettingsRepository.ts — THE performance fix
export function getGuildSettings(guildId: string): Promise<GuildSettings>;   // cached, TTL
export function invalidateGuildSettings(guildId: string): void;              // called on every write
```

**Every mutation is atomic.** No repository method may return a hydrated document for the caller to mutate and
save — that pattern is the money-duplication bug (finding 14).

`getGuildSettings` alone removes 6 of the 7 uncached queries fired on **every message in every guild**
(finding 49).

---

## Build order

1. `core/logger.ts` — everything else logs
2. `core/errors.ts` — depends on the logger
3. `config/*` — theme, strings, constants, env
4. `ui/format.ts`, `ui/embeds.ts` — depend on config
5. `core/customId.ts`, `core/timers.ts` — no dependencies
6. `core/middleware.ts` — depends on errors + repositories
7. `database/connection.ts`, models, repositories
8. `ui/components.ts`, `ui/pagination.ts` — depend on customId + embeds
9. `core/contentFilter.ts` — standalone

Write the tests alongside, not after. These modules are pure enough to test directly, and they are what
everything else is built on — see [`16-TESTING-STRATEGY.md`](16-TESTING-STRATEGY.md#7-core-framework-tests).
