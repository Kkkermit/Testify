# 10 — Target Architecture

The proposed TypeScript structure. Every choice here traces back to a specific finding in
`04-AUDIT-FINDINGS.md` — this is not a generic "best practices" layout.

---

## 1. Folder structure

```
testify/
├── src/
│   ├── index.ts                    Thin: build container, start, wire shutdown. Nothing else.
│   │
│   ├── core/                       Framework — no feature logic lives here
│   │   ├── client.ts               TestifyClient extends Client, typed properties
│   │   ├── loader.ts               Compiled-safe module discovery (replaces 5 fs.readdirSync sites)
│   │   ├── registry.ts             CommandRegistry, EventRegistry, ComponentRegistry
│   │   ├── router.ts               Component router — replaces the 27-listener fan-out
│   │   ├── customId.ts             Typed custom-ID codec (encode/decode, one separator)
│   │   ├── middleware.ts           blacklist · permissions · DMs · cooldown · underDevelopment
│   │   ├── errors.ts               Error classes + the single error boundary
│   │   ├── logger.ts               ONE logger (replaces four systems)
│   │   ├── timers.ts               Timer registry so shutdown can clear everything
│   │   └── shutdown.ts             Graceful shutdown: timers, DB, gateway
│   │
│   ├── config/
│   │   ├── env.ts                  Schema-validated env — throws at boot, not mid-command
│   │   ├── theme.ts                Colours + emoji, `as const`
│   │   ├── strings.ts              User-facing copy (i18n-ready)
│   │   └── constants.ts            Cooldowns, limits, timeouts — no more raw ms literals
│   │
│   ├── database/
│   │   ├── connection.ts           ONE connect, retry, health, graceful close
│   │   ├── models/                 30 models: interface + Schema<T> + model<T>, colocated
│   │   └── repositories/           The only place queries live
│   │       ├── economyRepository.ts    Kills the ~43 duplicated findOne sites
│   │       ├── guildSettingsRepository.ts  + cache — kills the 7-query hot path
│   │       └── …
│   │
│   ├── features/                   ── Feature-first, NOT surface-first ──
│   │   ├── economy/
│   │   │   ├── commands/           Shared implementations
│   │   │   ├── components/         Button/select/modal handlers
│   │   │   ├── services/           Business logic, testable without Discord
│   │   │   └── index.ts            Feature manifest
│   │   ├── moderation/
│   │   ├── music/
│   │   ├── levelling/
│   │   ├── tickets/
│   │   ├── help/
│   │   └── …
│   │
│   ├── adapters/
│   │   ├── slash.ts                SharedCommand → SlashCommandBuilder + handler
│   │   └── prefix.ts               SharedCommand → prefix handler
│   │
│   ├── integrations/               Typed external API clients + response interfaces
│   │   ├── valorant/ spotify/ instagram/ clashRoyale/ dbd/ tmdb/
│   │
│   ├── ui/
│   │   ├── embeds.ts               THE embed factory — replaces 459 inline builders
│   │   ├── components.ts           Button/row builders
│   │   └── pagination.ts           One paginator (replaces 3 ad-hoc implementations)
│   │
│   ├── jobs/                       Scheduled work with overlap guards
│   ├── server/                     Express OAuth callback — exported, NOT self-starting
│   └── types/                      Ambient declarations + .d.ts shims for untyped deps
│
├── assets/                         Moved OUT of src/: images/, jsons/
├── scripts/                        Maintenance CLIs (TS, run via tsx)
├── tests/
└── dist/                           Build output
```

### Why feature-first rather than the current surface-first split

Today, one feature is scattered across four trees. The economy lives in `commands/Economy/` (19 files),
`prefix/Economy/` (16 files), `events/EconCommandEvents/` (9 files) and `schemas/economySchema.js` — and its
shop UI alone is an 883-line event file physically distant from the command that opens it.

Grouping by feature puts a command, its component handlers, its service logic and its tests in one folder.
It is also what makes the shared-core deduplication natural instead of forced.

---

## 2. The typed client

Replaces the ~20 ad-hoc properties currently monkey-patched onto `Client`.

```ts
// src/core/client.ts
export class TestifyClient extends Client {
  readonly commands = new Collection<string, SharedCommand>();
  readonly components: ComponentRegistry;
  readonly logger: Logger;
  readonly config: Config;
  readonly db: Database;
  readonly timers: TimerRegistry;
  readonly startedAt: number;

  // Integrations, explicitly optional — they can genuinely be absent
  distube?: DisTube;
  giveaways?: GiveawaysManager;
  valorant?: ValorantCache;
}
```

**The four global-slot bugs are fixed by construction**, not by typing:

| Today | Target |
|---|---|
| `client.helpData` — one global slot, users overwrite each other | Page/category encoded in the custom ID; no server state |
| `client.errorMessageInteraction` — one slot, concurrent errors collide | Error context passed through, never stored |
| `client.blackjackGames` keyed by user ID only | `Map<\`${guildId}:${userId}\`, Game>` with a TTL |
| `client.activeHeists`, `client.modPanels` — lazily created in two places each | Owned by their feature module, created once |

Declaration merging is still needed for third-party attachments:

```ts
declare module 'discord.js' {
  interface Client {
    readonly logger: Logger;
    readonly config: Config;
  }
}
```

---

## 3. The loader — the single most important change

Today five `fs.readdirSync("./src/…")` calls resolve against `process.cwd()`, and `handleCommands` reads via a
CWD-relative path while `require`-ing via a `__dirname`-relative one. **None of this survives a `dist/` build.**

```ts
// src/core/loader.ts
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export async function loadModules<T>(
  pattern: string,
  validate: (mod: unknown, path: string) => T,
): Promise<T[]> {
  // Resolve from THIS module, never from the CWD — works identically in src/ and dist/
  const files = await glob(pattern, { cwd: resolve(here, '..'), absolute: true });
  const loaded: T[] = [];

  for (const file of files) {
    try {
      const mod = await import(file);
      loaded.push(validate(mod.default ?? mod, file));   // ← the validation the current loader lacks
    } catch (err) {
      logger.error({ file, err }, 'Failed to load module');
      throw new ModuleLoadError(file, err);              // fail loudly, with the filename
    }
  }
  return loaded;
}
```

Two failures this fixes directly: a command file missing `.data` currently crashes boot with an opaque error,
and `handleLogsEvent.js` currently registers a `client.on(undefined, …)` listener because nothing validates that
an event module has a `name`.

**Decision — ESM vs CommonJS.** Go ESM (`"type": "module"`, `module: "NodeNext"`). It is the direction of the
ecosystem, `node-fetch` v3 and several other deps are ESM-only, and top-level `await` simplifies the boot
sequence. The cost is that the top-level `return` statements and `__dirname` uses must be rewritten — which is
required work anyway.

---

## 4. The component router

Replaces 27 concurrent `interactionCreate` listeners, each independently type-guarding and string-matching.

```ts
// src/core/customId.ts — ONE separator, typed payloads
export function encode<T extends readonly string[]>(ns: string, action: string, ...args: T): string {
  return [ns, action, ...args].join(':');           // "shop:buy:item_42"
}
export function decode(id: string): { ns: string; action: string; args: string[] } {
  const [ns, action, ...args] = id.split(':');
  return { ns, action, args };
}

// src/core/router.ts
export class ComponentRouter {
  private handlers = new Map<string, ComponentHandler>();

  register(ns: string, handler: ComponentHandler): void {
    if (this.handlers.has(ns)) throw new Error(`Duplicate namespace: ${ns}`);  // catches the spotify-* collision
    this.handlers.set(ns, handler);
  }

  async dispatch(interaction: MessageComponentInteraction | ModalSubmitInteraction): Promise<void> {
    const { ns, action, args } = decode(interaction.customId);
    await this.handlers.get(ns)?.handle(interaction, action, args);
  }
}
```

One `interactionCreate` listener, one `O(1)` lookup. The duplicate-namespace check turns today's silent
`spotify-tracks` double-claim into a boot-time error, and `back-` can no longer land-grab every ID bot-wide.

---

## 5. The shared command core

The mechanism that collapses 46 duplicated command pairs into single implementations.

```ts
// src/core/command.ts
export interface SharedCommand {
  name: string;
  description: string;
  category: Category;                    // enum, not a free-form string
  aliases?: string[];                    // prefix surface only
  options?: OptionDefinition[];          // surface-agnostic; adapters translate
  permissions?: PermissionResolvable[];
  cooldown?: number;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  surfaces: ('slash' | 'prefix')[];      // which adapters to generate
  execute(ctx: CommandContext): Promise<void>;
}

// The abstraction that makes one implementation serve both surfaces
export interface CommandContext {
  client: TestifyClient;
  guild: Guild | null;
  user: User;
  member: GuildMember | null;
  channel: TextBasedChannel;
  options: ResolvedOptions;                        // uniform accessor
  reply(options: ReplyOptions): Promise<void>;     // maps to interaction.reply OR message.reply
  defer(): Promise<void>;                          // no-op on the prefix surface
  followUp(options: ReplyOptions): Promise<void>;
}
```

`CommandContext` is the load-bearing piece. It hides the interaction/message difference so a command's business
logic never branches on its surface, and it is trivially mockable in tests — unlike today, where testing a
command means faking a full `Interaction`.

The `reply` implementation is also where the 158 `ephemeral: true` sites and the 63 meaningless
`MessageFlags.Ephemeral`-on-`message.reply` sites get resolved once: the slash adapter maps `ephemeral` to
`flags: MessageFlags.Ephemeral`, and the prefix adapter ignores it.

---

## 6. The embed factory

459 `new EmbedBuilder()` calls, ~90 of them repeating the same six chained methods.

```ts
// src/ui/embeds.ts
export function embed(opts: {
  category: Category;
  title?: string;
  description?: string;
  fields?: APIEmbedField[];
  thumbnail?: string;
  footer?: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(theme.colors[opts.category])
    .setAuthor({ name: `${opts.title ?? ''} ${theme.devBy}`.trim() })
    .setTimestamp()
    .setFooter({ text: opts.footer ?? theme.defaultFooter });
}

export const errorEmbed   = (msg: string) => embed({ category: 'error',   description: `${theme.emoji.error} ${msg}` });
export const successEmbed = (msg: string) => embed({ category: 'success', description: `${theme.emoji.success} ${msg}` });
```

Estimated reduction: **~800 lines**, and colour/branding changes become one-file edits.

---

## 7. Error handling

Today: 400 ad-hoc `catch` blocks, several empty, several collapsing every failure to `null`, and prefix-command
errors never reaching the error channel at all.

```ts
// src/core/errors.ts
export class UserFacingError extends Error {}      // shown to the user verbatim
export class PermissionError extends UserFacingError {}
export class NotFoundError extends UserFacingError {}
export class ExternalApiError extends Error {}     // logged with full context, generic message to the user

// One boundary wraps every execute(), for BOTH surfaces
export async function withErrorBoundary(ctx: CommandContext, fn: () => Promise<void>) {
  try { await fn(); }
  catch (err) {
    if (err instanceof UserFacingError) return ctx.reply({ embeds: [errorEmbed(err.message)], ephemeral: true });
    ctx.client.logger.error({ err, command: ctx.commandName, user: ctx.user.id }, 'Command failed');
    await reportToErrorChannel(err, ctx);
    return ctx.reply({ embeds: [errorEmbed(strings.genericError)], ephemeral: true });
  }
}
```

---

## 8. Data access

```ts
// src/database/repositories/economyRepository.ts
export async function getOrCreateAccount(guildId: string, userId: string): Promise<IEconomy> {
  return Economy.findOneAndUpdate(
    { guildId, userId },
    { $setOnInsert: { guildId, userId, wallet: 0, bank: 0 } },
    { upsert: true, new: true, lean: true },
  );
}

// ATOMIC — fixes the money-duplication race (finding 14)
export async function adjustWallet(guildId: string, userId: string, delta: number): Promise<IEconomy> {
  return Economy.findOneAndUpdate({ guildId, userId }, { $inc: { wallet: delta } }, { new: true, lean: true });
}
```

Plus a guild-settings cache that removes 6 of the 7 per-message queries:

```ts
// src/database/repositories/guildSettingsRepository.ts
const cache = new Map<string, { value: GuildSettings; expires: number }>();

export async function getGuildSettings(guildId: string): Promise<GuildSettings> { /* TTL + invalidate on write */ }
```

---

## 9. Decisions to confirm before starting

| Decision | Recommendation | Why |
|---|---|---|
| Module system | **ESM** | Ecosystem direction; several deps are ESM-only; top-level await |
| Build | **tsup** (esbuild) | Fast; handles the asset copy; `tsc --noEmit` still gates types |
| Runtime target | **Node 22 LTS** | Resolves the three-way `.nvmrc`/CI/README disagreement |
| Test runner | **Vitest** | Native ESM+TS, no babel layer; the current jest+babel setup is already fragile |
| Mongoose | **v8** | v6 is EOL; the removed options are already being passed |
| Prefix commands | **Keep** | 26 commands — all of music — exist *only* as prefix. Removing them is a feature cut, not a refactor |
| `/ai` (`apexify.js`) | **Delete and rebuild** | Untyped, unstable, and already unreachable behind `underDevelopment: true` |
| Canvas stack | **Standardise on `@napi-rs/canvas`** | Ships types, prebuilt binaries; drops the most common install failure |
| `discord-logs` patch | **Vendor ~90 lines, drop the dep** | Patching `node_modules` cannot survive an install |
| Strictness | **`strict: true` from day one** | Retrofitting strictness across 321 files later is far worse |

The prefix-commands and `/ai` rows are the two that change scope rather than approach — worth an explicit
decision before phase 1.
