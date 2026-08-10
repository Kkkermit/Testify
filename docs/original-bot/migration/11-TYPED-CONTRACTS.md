# 11 — Typed Contracts

The interfaces the rewrite is built on, written out in full so they can be pasted directly into a prompt.

---

## 1. Category enum — replacing 20 free-form strings

Today `category` is an untyped string, 9 files disagree with their folder, and
`utils/helpCommandUtils.js` keeps a hand-written emoji map containing three categories no command uses.

```ts
// src/config/categories.ts
export const Category = {
  Economy:    'economy',
  Moderation: 'moderation',
  Community:  'community',
  Info:       'info',
  Fun:        'fun',
  Music:      'music',
  Levelling:  'levelling',
  MiniGames:  'minigames',
  Settings:   'settings',
  Tickets:    'tickets',
  Giveaway:   'giveaway',
  Profile:    'profile',
  Integrations: 'integrations',
  Owner:      'owner',
  Developer:  'developer',
} as const;

export type Category = (typeof Category)[keyof typeof Category];

// Emoji map is now exhaustive by construction — a missing entry is a compile error
export const categoryEmoji: Record<Category, string> = { /* … */ };
export const categoryColor: Record<Category, ColorResolvable> = { /* … */ };
```

---

## 2. `SharedCommand` — one implementation, two surfaces

The contract that collapses the 46 duplicated command pairs.

```ts
// src/core/command.ts
export type Surface = 'slash' | 'prefix';

export interface OptionDefinition {
  name: string;
  description: string;
  type: 'string' | 'integer' | 'number' | 'boolean' | 'user' | 'channel' | 'role' | 'attachment';
  required?: boolean;
  choices?: { name: string; value: string | number }[];
  autocomplete?: boolean;
  minValue?: number;
  maxValue?: number;
}

export interface SharedCommand {
  name: string;
  description: string;
  category: Category;
  surfaces: Surface[];

  aliases?: string[];              // prefix surface only
  options?: OptionDefinition[];    // surface-agnostic; the adapters translate
  subcommands?: SharedSubcommand[];

  permissions?: PermissionResolvable[];   // user permissions
  botPermissions?: PermissionResolvable[];// NEW — the bot's own perms are unchecked today
  cooldown?: number;                      // NEW — no cooldown system exists today
  guildOnly?: boolean;                    // replaces `usableInDms: false`
  ownerOnly?: boolean;                    // replaces the 6 inline developer-ID comparisons
  nsfw?: boolean;

  execute(ctx: CommandContext): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction, client: TestifyClient): Promise<void>;
}

export interface SharedSubcommand {
  name: string;
  description: string;
  options?: OptionDefinition[];
  execute(ctx: CommandContext): Promise<void>;
}
```

**Fields deliberately added** that do not exist today: `botPermissions` (the bot's own permissions are never
checked, so `/ban` fails with a raw API error when the bot lacks the permission), `cooldown` (there is no
cooldown system at all), and `ownerOnly` (replacing six copy-pasted `config.developers` comparisons, one of
which does substring matching — finding 27).

---

## 3. `CommandContext` — the surface abstraction

The load-bearing piece. Business logic never branches on whether it was invoked by an interaction or a message.

```ts
// src/core/context.ts
export interface ReplyOptions {
  content?: string;
  embeds?: EmbedBuilder[];
  components?: ActionRowBuilder<MessageActionRowComponentBuilder>[];
  files?: AttachmentBuilder[];
  ephemeral?: boolean;   // slash → flags: MessageFlags.Ephemeral; prefix → ignored
}

export interface CommandContext {
  readonly client: TestifyClient;
  readonly surface: Surface;
  readonly guild: Guild | null;
  readonly channel: GuildTextBasedChannel | DMChannel;
  readonly user: User;
  readonly member: GuildMember | null;
  readonly options: ResolvedOptions;
  readonly commandName: string;

  reply(options: ReplyOptions): Promise<void>;
  defer(ephemeral?: boolean): Promise<void>;    // no-op on prefix
  editReply(options: ReplyOptions): Promise<void>;
  followUp(options: ReplyOptions): Promise<void>;
}

export interface ResolvedOptions {
  getString(name: string, required: true): string;
  getString(name: string, required?: false): string | null;
  getInteger(name: string, required: true): number;
  getInteger(name: string, required?: false): number | null;
  getUser(name: string, required: true): User;
  getUser(name: string, required?: false): User | null;
  getMember(name: string): GuildMember | null;
  getChannel(name: string): GuildBasedChannel | null;
  getRole(name: string): Role | null;
  getBoolean(name: string): boolean | null;
  getSubcommand(): string | null;
}
```

The overloads on `ResolvedOptions` are what make `required: true` return a non-nullable type — the same
ergonomics discord.js provides, preserved across both surfaces.

**This is also where three codebase-wide bugs get fixed once:**
- `reply()` maps `ephemeral` correctly per surface — resolving 158 `ephemeral: true` sites and 63 meaningless
  `MessageFlags.Ephemeral`-on-`message.reply` sites.
- The prefix adapter can finally **`await`** the command (finding 19).
- `member` is correctly `null` in DMs, so the permission gate cannot crash (finding 22).

---

## 4. Events

```ts
// src/core/event.ts
export interface EventHandler<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(client: TestifyClient, ...args: ClientEvents[K]): Promise<void> | void;
}

// Helper preserving the key→args relationship
export function defineEvent<K extends keyof ClientEvents>(handler: EventHandler<K>): EventHandler<K> {
  return handler;
}
```

**Note the argument order change.** Today the loader appends `client` *last*, producing a different arity per
event type and three files with signatures so wrong they never execute (findings 1, 2). Putting `client`
**first** makes the payload spread type-safe and the mistake impossible.

```ts
export default defineEvent({
  name: Events.GuildMemberAdd,
  async execute(client, member) {           // member is GuildMember — inferred, not asserted
    await sendWelcomeCard(client, member);
  },
});
```

---

## 5. Components and the custom-ID codec

```ts
// src/core/customId.ts
export const Namespace = {
  Shop: 'shop', Heist: 'heist', Pet: 'pet', Blackjack: 'blackjack', Lottery: 'lottery',
  Inventory: 'inv', Reset: 'reset', ModPanel: 'modpanel', Ticket: 'ticket', Help: 'help',
  GuildList: 'guildlist', UserInfo: 'userinfo', Spotify: 'spotify', Valorant: 'valorant',
  Verify: 'verify', Eval: 'eval', Dbd: 'dbd', Minecraft: 'mc', ErrorTriage: 'errtriage',
} as const;
export type Namespace = (typeof Namespace)[keyof typeof Namespace];

const SEP = ':';   // ONE separator — today there are three conventions

export function encodeId(ns: Namespace, action: string, ...args: string[]): string {
  const id = [ns, action, ...args].join(SEP);
  if (id.length > 100) throw new Error(`customId exceeds Discord's 100-char limit: ${id}`);
  return id;
}

export function decodeId(raw: string): { ns: string; action: string; args: string[] } {
  const [ns = '', action = '', ...args] = raw.split(SEP);
  return { ns, action, args };
}
```

The length check matters: several current IDs interpolate multiple snowflakes
(`modpanel_<panelId>_<modId>_<targetId>_<action>` is ~80 characters) and nothing guards Discord's 100-character
limit today.

```ts
// src/core/component.ts
export interface ComponentHandler {
  namespace: Namespace;
  type: 'button' | 'select' | 'modal';
  ownerOnly?: boolean;   // enforce "only the invoking user may click" declaratively
  handle(ctx: ComponentContext, action: string, args: string[]): Promise<void>;
}
```

`ownerOnly` replaces the hand-rolled "is this your button?" check that several handlers do by embedding the
user ID in the custom ID and comparing — and that others simply forget.

---

## 6. Models and repositories

```ts
// src/database/models/economy.ts
export interface Pet {
  id: string; name: string; type: string; emoji: string;
  happiness: number; hunger: number;
  purchasedAt: Date; lastFed: Date | null; lastWalked: Date | null;
}

export interface EconomyAccount {
  guildId: string;
  userId: string;
  wallet: number;
  bank: number;
  inventory: InventoryItem[];
  job: string;
  jobLevel: number;
  house: House | null;
  businesses: Business[];
  pet: Pet | null;
  dailyStreak: number;
  lastDaily: Date | null;
  // … all 27 fields, explicitly typed
  createdAt: Date;   // from { timestamps: true }
  updatedAt: Date;
}

const economySchema = new Schema<EconomyAccount>({
  guildId: { type: String, required: true },
  userId:  { type: String, required: true },
  wallet:  { type: Number, required: true, default: 0 },
  bank:    { type: Number, required: true, default: 0 },
  // …
}, { timestamps: true });

economySchema.index({ guildId: 1, userId: 1 }, { unique: true });   // the index that does not exist today

export const Economy = model<EconomyAccount>('Economy', economySchema);
```

Note `required: true` with defaults on the numeric fields. Today 19 of 32 schemas declare **no** `required` and
**no** defaults, so every field is optional and every read is `T | null` with all-optional members. Making
balances non-nullable removes a large class of `?? 0` noise from the feature code.

```ts
// src/database/repositories/economyRepository.ts
export async function getOrCreateAccount(guildId: string, userId: string): Promise<EconomyAccount>;
export async function adjustWallet(guildId: string, userId: string, delta: number): Promise<EconomyAccount>;  // atomic $inc
export async function transfer(guildId: string, from: string, to: string, amount: number): Promise<void>;
export async function getLeaderboard(guildId: string, limit: number): Promise<EconomyAccount[]>;
```

---

## 7. Ambient declarations for untyped dependencies

Write these in Phase 1 so feature phases are not blocked.

```ts
// src/types/discord-gamecord.d.ts
declare module 'discord-gamecord' {
  interface BaseGameOptions {
    message: import('discord.js').Message | import('discord.js').ChatInputCommandInteraction;
    isSlashGame?: boolean;
    embed?: { title?: string; color?: string; description?: string };
    timeoutTime?: number;
    playerOnlyMessage?: string;
  }
  export class Wordle   { constructor(o: BaseGameOptions & { /* … */ }); startGame(): Promise<void>; }
  export class Connect4 { constructor(o: BaseGameOptions & { opponent: import('discord.js').User }); startGame(): Promise<void>; }
  // … 12 more classes — see src/commands/MiniGames/minigame.js for every options object in use
}
```

Similar shims needed for `canvafy`, `discord-arts`, and `canvacord` v5.
**`apexify.js` should be deleted rather than shimmed** — it is unstable, untyped, and its only consumer is
already unreachable behind `underDevelopment: true`.

---

## 8. External API response types

Every `axios`/`fetch` response in the codebase is consumed untyped. These are the interfaces to write:

| Integration | Types needed |
|---|---|
| Clash Royale | `ClashPlayer`, `ClashClan`, `ClashCard`, `ClashBattle` |
| Dead by Daylight | `DbdPerk`, `DbdShrine`, `DbdPlayerStats` |
| TMDB | `TmdbSearchResponse`, `TmdbMovie` |
| Reddit | `RedditListing<T>`, `RedditPost` |
| Spotify | `SpotifyTopItems<T>`, `SpotifyTrack`, `SpotifyArtist`, `SpotifyAlbum`, `SpotifyTokenResponse` |
| Valorant | `ValorantStore`, `ValorantWallet`, `ValorantSkin`, `ValorantTokens` |
| Instagram | `InstagramUser`, `InstagramPost` |
| mcsrvstat | `MinecraftServerStatus` |

Validate at the boundary with Zod rather than casting — these are third-party APIs that change without notice,
and today every failure mode collapses to `null` or an unhandled `TypeError`.

```ts
const ClashPlayerSchema = z.object({ tag: z.string(), name: z.string(), trophies: z.number(), /* … */ });
export type ClashPlayer = z.infer<typeof ClashPlayerSchema>;
```

---

## 9. `tsconfig.json` strictness

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,      // catches args[0] on an empty array — see the kick.js bug
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,    // the switch statements in valorantApi.js
    "allowUnreachableCode": false,         // the `break` after `return` in valorantApi.js
    "allowUnusedLabels": false,

    "module": "CommonJS",                  // see 12-TOOLING.md §1 for why CommonJS
    "moduleResolution": "Node",
    "esModuleInterop": true
  }
}
```

`noUncheckedIndexedAccess` is the highest-value flag for this codebase specifically: array and record indexing
is pervasive in the prefix commands (`args[0]`, `args[1]`) and is exactly where the `kick.js` off-by-one bug
lives.
