# 17 — Coding Standards

Conventions for the TypeScript rewrite. Every rule here exists because the audit found the opposite
in the current codebase — the finding number is cited so you can see the evidence.

Where a rule can be machine-enforced it is, via the ESLint config in
[`12-TOOLING.md`](12-TOOLING.md#4-eslint-flat-config). **Prefer a lint rule to a paragraph.**

---

## 1. Naming

### Files

| Kind | Convention | Example |
|---|---|---|
| Modules | `camelCase.ts` | `economyRepository.ts`, `customId.ts` |
| Commands | `camelCase.ts`, matching the command name | `accountInfo.ts` for `/account-info` |
| Types-only | `types.ts` inside the owning folder | `integrations/valorant/types.ts` |
| Tests | `<subject>.test.ts`, mirroring `src/` | `tests/features/economy/balance.test.ts` |
| Ambient declarations | `<package>.d.ts` in `src/types/` | `discord-gamecord.d.ts` |

One `camelCase` convention throughout. The current tree mixes `camelCase.js`, `PascalCase` folders and
`kebab-case` command names with no rule.

### Code

```ts
interface EconomyAccount { }        // PascalCase, NO `I` prefix
type Surface = 'slash' | 'prefix';  // PascalCase
function getOrCreateAccount() { }   // camelCase, verb-first
const MAX_INVENTORY_SIZE = 50;      // SCREAMING_SNAKE for module-level constants
const economyRepository = { };      // camelCase for everything else
enum-likes → `as const` objects     // see §2
```

**No `I` prefix on interfaces.** It is a C# convention that adds nothing in TypeScript — the compiler already
knows what is an interface, and the prefix leaks an implementation detail into every call site. Model types
are named for the domain concept: `EconomyAccount`, not `IEconomy` or `EconomyDocument`.

**Booleans read as assertions:** `isEnabled`, `hasPermission`, `canAfford` — not `enabled`, `permission`.

**Async functions are not suffixed** with `Async`. The `await` at the call site says it.

### Database fields — settle the four-way split

The current schemas use **`Guild`**, **`GuildID`**, **`guildId`** and **`serverID`** for the same concept,
and six different spellings for the user key (§3.1 of [`../07-DATA-MODEL.md`](../07-DATA-MODEL.md)).

**Rule: `camelCase` in TypeScript, `guildId` and `userId` universally.**

> ⚠️ Renaming a field is a **data migration**, not a rename. Either write the migration script deliberately or
> keep the old field name in the schema and map it in the repository. Do not silently change a field name and
> assume Mongo will follow — it will not, and reads will return `undefined`.

---

## 2. No magic values

| Instead of | Use | Finding |
|---|---|---|
| `86400000`, `3600000`, `60000` | `constants.ts`: `DAILY_COOLDOWN_MS`, `ROB_COOLDOWN_MS` | ~20 inline literals |
| `category: "Server Utils"` | the `Category` enum | 20 free-form strings, 9 folder mismatches |
| `eventType: 1`, `triggerType: 4` | `AutoModerationRuleEventType.MessageSend` | 72 |
| `.setStyle('1')` | `ButtonStyle.Primary` | 71 |
| `opt.toJSON().type === 1` | `ApplicationCommandOptionType.Subcommand` | — |
| `return ["X"]` as "no badges" | `return []` | `discordBadges.js` sentinel |
| `threshold: 60000000000000` | `Number.MAX_SAFE_INTEGER` or a named `NEVER` | 4 copies |

Discord.js exports an enum for nearly everything. If you are writing a number that Discord defined, you are
writing the wrong thing.

---

## 3. File organisation

```
src/features/<feature>/
  commands/      One file per command. Thin — parse input, call a service, render a reply.
  components/    Button/select/modal handlers, one per namespace.
  services/      Business logic. Pure where possible. NO discord.js imports.
  data/          Static catalogues, `as const`.
  index.ts       Feature manifest — what this feature registers.
```

**`services/` must not import discord.js.** That single rule is what keeps the bulk of the logic testable
without mocks, and it is the difference between a suite that gets written and one that does not.

### Size limits

- **Files: soft 200 lines, hard 400.** The audit found 16 files over 300, topping out at 1,301.
- **Functions: soft 50 lines.**
- **A command's `execute()`: under 40 lines.** Longer means logic belongs in a service.

Hitting a limit is a signal to extract, not to reformat.

---

## 4. Anti-patterns that must not come back

Each of these is in the current codebase at scale. **This is the section to re-read before opening a PR.**

### 4.1 Read-modify-`save()` on anything numeric — finding 14

```ts
// ✗ NEVER. Two concurrent calls lose one of the writes. This is an exploitable money bug.
const acc = await Economy.findOne({ guildId, userId });
acc.wallet += amount;
await acc.save();

// ✓ Atomic.
await Economy.findOneAndUpdate({ guildId, userId }, { $inc: { wallet: amount } }, { new: true });
```

### 4.2 Inline embed construction — finding 56

459 instantiations, ~90 files repeating the same six chained calls.

```ts
// ✗                                        // ✓
new EmbedBuilder()                          embed({ category: Category.Economy,
  .setColor(client.config.embedEconomy)             title: 'Balance',
  .setAuthor({ name: `Balance ${devBy}` })          description: `Wallet: ${wallet}` })
  .setTimestamp()
  .setFooter({ text: 'Economy' })
```

### 4.3 Ad-hoc `catch` — findings 43, and the empty catches in S2

```ts
try { … } catch (e) { }                     // ✗ swallows silently — 2 real instances today
try { … } catch (e) { return null; }        // ✗ collapses every failure mode — 6 instances
catch (e) { console.log(e); } return res.data; // ✗ turns a rejection into a TypeError — 2 instances
```

Only catch when you will **handle** it. Let the error boundary do the rest. If you must catch, log with
context and rethrow a typed error.

### 4.4 Floating promises — findings 19, and the un-awaited replies

```ts
command.execute(message, client, args);     // ✗ errors escape the try/catch entirely
interaction.reply({ … });                   // ✗ unhandled rejection if the reply fails
```

**Always `await`.** Enforced by `@typescript-eslint/no-floating-promises`.

### 4.5 Raw `console.*` — finding 90

298 calls across 41 files, alongside three other logging systems. Use the logger. Enforced by `no-console`.

```ts
logger.error({ err, commandName, userId }, 'Command failed');   // structured — the error survives
```

The current `client.logs.error('msg', err)` **silently discards `err`** because `write()` takes one argument.

### 4.6 `ephemeral: true` — finding 65

158 sites. Deprecated. Use `ctx.reply({ ephemeral: true })` and let the adapter map it to
`flags: MessageFlags.Ephemeral`. Never pass it to `message.reply()` — it is meaningless there (63 sites do).

### 4.7 Other banned patterns

| Pattern | Rule |
|---|---|
| `.then()` mixed with `async/await` | Pick `async/await` |
| `==` / `!=` | `===` / `!==` (`eqeqeq`) |
| `var` | `const`, or `let` when reassigned |
| Mutable module-scope `Map`s as caches | A typed cache with a TTL and eviction |
| Single global slots on `client` | Per-invocation state, or a keyed `Map` — findings on `helpData`, `errorMessageInteraction` |
| State recovered by regex-parsing embeds | Encode state in the custom ID |
| `require()` outside the loader | Static `import` |
| Hardcoded IDs/emoji in source | `config/` or env — see [`19-OPEN-SOURCE.md`](19-OPEN-SOURCE.md) |
| `npm install` at runtime | Never — finding 40 |
| Writing to `node_modules` | Never — finding 88 |

---

## 5. Error handling

```ts
throw new UserFacingError('You need 500 coins to buy this.');   // shown verbatim to the user
throw new PermissionError('You need Manage Roles.');            // shown verbatim
throw new NotFoundError('No account yet — run /economy create.');// shown verbatim
throw new ExternalApiError('clash-royale', cause);              // logged with context, generic message shown
```

**Rule:** if the user can act on it, `UserFacingError`. Otherwise let it reach the boundary, which logs with
full context and replies with a generic message. Never surface a raw stack trace or
`error.toString().slice(0, 1000)` — the current pattern.

The boundary wraps **both** surfaces. Today only the slash path reports errors; prefix-command errors are
never logged to the error channel (finding 19).

---

## 6. Async

- `await` everything. No floating promises.
- No `async` on a function that never awaits (`require-await`).
- `await Promise.all(items.map(fn))` — **never `await arr.forEach(async …)`**, which does not await at all
  (finding 32).
- Sequential loops only when order matters; say why in a comment.
- Every `setInterval`/`setTimeout` handle goes to the timer registry so shutdown can clear it (finding 44).
- Long-running periodic work needs an **overlap guard** (finding 15).

---

## 7. Imports

```ts
// 1. Node built-ins
import { readFile } from 'node:fs/promises';
// 2. External packages
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
// 3. Internal aliases
import { logger } from '@core/logger';
import { economyRepository } from '@db/repositories/economyRepository';
// 4. Relative
import { calculatePayout } from './services/payout';
// 5. Types last
import type { CommandContext } from '@core/context';
```

Use the `node:` prefix for built-ins. Use path aliases across features, relative paths within one. Enforced by
`eslint-plugin-import`; **no circular imports** (`import/no-cycle`) — the current
`processHandlers → index` cycle resolves to `{}` and works only by accident (finding 39).

---

## 8. Comments and JSDoc

The current codebase has **98 comment lines across 32,784**, and **zero JSDoc**.

**Rules:**
1. **JSDoc every exported function** in `core/`, `ui/` and `database/repositories/` — one line on what it does
   plus any non-obvious parameter.
2. **Comments explain *why*, never *what*.** The code says what.
3. **Document every workaround** with its reason, and a link if there is an upstream issue.
4. **No commented-out code.** Git remembers.
5. **Non-obvious constants get a comment**: `const DAILY_COOLDOWN_MS = 86_400_000; // 24h`

```ts
/** Fetches the account, creating it on first use. Never returns null. */
export async function getOrCreateAccount(guildId: string, userId: string): Promise<EconomyAccount>

// Riot rotates this platform blob roughly yearly; regenerate from a client build if /store 403s.
const CLIENT_PLATFORM = '…';
```

Use numeric separators for large literals: `86_400_000` reads, `86400000` does not.

---

## 9. Commits and branches

Keep the existing conventional-commit types from `CONTRIBUTING.md` — `feat`, `fix`, `docs`, `style`,
`refactor`, `perf`, `test`, `chore` (drop the redundant `add`/`update`/`remove`, which overlap `feat`/`fix`).

```
feat(economy): add atomic wallet adjustments
fix(moderation): read args[0] instead of args[1] for the kick target
```

Branches: `feat/…`, `fix/…`, `docs/…`, `refactor/…`.

> The `npm run commit` helper must be rewritten before use — it interpolates the message into a shell string,
> so a `"` or `$(…)` executes (finding 16). Use `execFile('git', ['commit', '-m', message])`.

---

## 10. Pull requests

Every PR must: pass `npm run check`; include tests for new logic; touch one concern; update docs when
behaviour changes; introduce no new `@ts-expect-error` without a comment explaining why.

**Reviewer checklist:**

- [ ] No read-modify-`save()` on numeric fields
- [ ] No inline `EmbedBuilder` — uses the factory
- [ ] No raw `console.*`
- [ ] All promises awaited
- [ ] Timers registered with the timer registry
- [ ] New custom IDs use the codec and a unique namespace
- [ ] New env vars added to the schema **and** the example file
- [ ] No hardcoded IDs, emoji or URLs
- [ ] Business logic is in `services/`, not in `execute()`
