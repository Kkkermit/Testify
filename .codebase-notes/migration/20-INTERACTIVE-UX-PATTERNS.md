# 20 — Interactive UX Patterns (Buttons, Select Menus, Modals)

**Why this document exists:** the bot's interaction design is its best feature and the thing most likely to be
lost in a rewrite. Nothing about "`/shop pets` opens a browsable catalogue you click through" is visible in the
command definitions — it lives scattered across 883-line event files. This captures the patterns worth keeping,
the places the bot still makes users type things it shouldn't, and how to build both in TypeScript.

**The design goal:** *the user should never have to know or type an ID.* Where the bot already achieves this it
is genuinely good; where it doesn't, this document says so.

---

## 1. What exists today, by the numbers

| Primitive | Count |
|---|---|
| `new ButtonBuilder()` | 161 across 40 files |
| Select menus (`String`/`User`) | 30 |
| `new ModalBuilder()` | 9 files |
| `interaction.update()` — in-place re-render | 55 |
| `interaction.reply()` in event handlers | 130 |
| Ownership guards ("only you may press this") | 9 sites |
| Scoped collectors | 7 files |
| Global `interactionCreate` listeners | 27 |

**Component-heaviest files:**

| File | Buttons | Selects | Modals |
|---|---:|---:|---:|
| `events/HelpCommandEvents/helpInteractions.js` | 22 | 6 | — |
| `events/EconCommandEvents/shopInteractions.js` | 17 | 6 | — |
| `commands/Community/calculator.js` | 20 | — | — |
| `commands/Economy/shop.js` | 5 | 5 | — |
| `events/EconCommandEvents/heistHandler.js` | 7 | — | — |
| `commands/Valorant/valorantCommands.js` | 6 | — | 1 |

---

## 2. The exemplar — the shop drill-down

This is the pattern you described wanting, and **the bot already does it**. `/shop pets` never asks for an ID.
Four levels, each re-rendering the *same message* via `interaction.update()`:

```
/shop pets
  └─ embed + [shop_pet_category ▾]  + nav row
                                       [shop_nav_items] [shop_nav_houses] [shop_nav_businesses]
                                       [shop_nav_jobs]  [shop_nav_pets]
        │  user picks a rarity tier
        ▼
     shop_pet_category  →  update() → [shop_select_pet ▾] + [shop_nav_pets ← Back]
        │  user picks a pet
        ▼
     shop_select_pet    →  update() → detail embed
                                      [shop_adopt_pet_<petId>] [shop_nav_pets ← Back]
        │  user confirms
        ▼
     shop_adopt_pet_<petId> → writes the DB, update() → success embed
                                      [pet_check_<petId>  "Check on your pet"]
        │  follow-through into the pet feature
        ▼
     pet_check_<petId>  → handled by petInteractions.js
                          [pet_feed_<id>] [pet_walk_<id>]
```

**Five properties worth naming, because they are what make it feel seamless:**

1. **No ID is ever typed.** The pet ID only exists inside a custom ID, minted by the bot.
2. **One message, mutated.** `update()` rather than `reply()` — no channel spam.
3. **Every screen has a way back.** `shop_nav_pets` acts as Back at two different depths.
4. **Lateral navigation is always available.** The nav row persists, so you can jump from pets to jobs without
   re-running the command.
5. **The flow chains into the next feature.** Adopting hands you a "Check on your pet" button that lands in an
   entirely different handler — the user never returns to a command picker.

The same shape appears in the item, house, business and job branches: `shop_select_*` → detail →
`shop_buy_*_<id>` confirm.

> **Two defects in this flow to fix, not copy.** The nav row is built **twice** — once in
> `commands/Economy/shop.js` for the first render and again in `events/EconCommandEvents/shopInteractions.js`
> for every re-render, ~30 duplicated lines that must be kept in sync by hand. And `shopInteractions.js`
> contains a `pet_check_` branch that is unreachable, because the file guards on `customId.startsWith('shop_')`
> at the top. (The button still works — `petInteractions.js` handles it — but the dead branch is misleading.)

---

## 3. The interaction archetypes

Six recurring shapes. In the rewrite these become **reusable helpers**, not copy-paste.

### 3.1 Drill-down browser
`shop` (items, houses, businesses, jobs, pets) · `help` (category → page → command)

Catalogue → select → detail → confirm, always via `update()`. **The pattern for anything with a list.**

### 3.2 Confirm / cancel on destructive actions
`rehome_confirm_<userId>` / `rehome_cancel_<userId>` · `reset_user_confirm_<id>` / `reset_server_confirm_<id>` /
`reset_cancel` · `lottery_disable_confirm_<guildId>` / `lottery_disable_cancel_<guildId>` ·
`eval_continue_<userId>` / `eval_cancel_<userId>`

Never destroy data on the first click. The `/eval` variant is the most interesting: it **scans the submitted
code for token and Mongo-URI patterns and only demands confirmation when the code looks risky** — a
context-sensitive confirm, which is a genuinely nice touch worth preserving.

### 3.3 Button → modal, for structured input
`modpanel_<panelId>_<modId>_<targetId>_<action>` → modal `modpanel_modal_<panelId>_<action>`

The mod panel is the best example in the repo. Pressing **Timeout** opens a modal whose fields are **built
conditionally for that action**:

| Action | Modal fields |
|---|---|
| `warn` | Reason (paragraph, required, max 1000) |
| `timeout` | Reason + Duration in minutes |
| `kick` | Reason |
| `ban` | Reason + Delete-messages days (0–7) |
| `softban` | Reason + Duration + Delete-messages days |

This is strictly better than slash options: no 25-option limit, multi-line paragraph input, and the form adapts
to what you picked. Also used by `/eval`, `/bug-report`, `/suggest`, `/say`, and the DM-response flow.

### 3.4 Multi-user lobby
`heist_join_<heistId>` / `heist_start_<heistId>` / `heist_cancel_<heistId>`

A shared message multiple users interact with. The embed re-renders with the participant list on each join, and
**Start is `.setDisabled()` until the minimum player count is met** — the UI enforces the rule rather than
erroring after the fact. Join is open to anyone; start and cancel are creator-only.

### 3.5 Pagination
`inventory_prev` / `inventory_next` · `guildlist-<action>-<userId>` · `help_page_<...>`

**Three separate implementations, all with state-recovery problems:**

| Where | How state is recovered | Problem |
|---|---|---|
| `inventoryPagination.js` | Regex-parses `Page (\d+)/(\d+)` out of the embed footer when the in-memory map misses | Also schedules a **new** 5-minute timeout on *every* press |
| `guildListPaginationEvent.js` | **Fetches 10 surrounding channel messages and regex-parses a ```json blob out of a bot message** | Extremely fragile |
| `helpInteractions.js` | Reads the global `client.helpData` | **One global slot — two users overwrite each other** |

All three are solved the same way: **put the page number in the custom ID.** Stateless, restart-proof,
no timers.

### 3.6 Refresh / re-roll in place
`minecraft-refresh_<ip>` · `dbd_reroll_<role>` · `spotify-<type>-<userId>-<timeRange>` ·
`skin-preview_<type>_<uuid>_<idx>`

A button that re-runs the query and updates the same message. Cheap to add, and it makes a static embed feel
alive. `spotify` is the nicest: three buttons switch between tracks/artists/albums *and* the time range
without re-invoking the command.

---

## 4. Ownership — who is allowed to press

Nine handlers check this; the rest don't. Three different rules are in use, and the distinction is real:

| Rule | Used by | Meaning |
|---|---|---|
| **Invoker only** | `inventoryPagination`, `guildListPagination`, `petInteractions` (rehome), `evalEvent` | Private to the person who ran the command |
| **Role-holder only** | `modPanelButtonHandler` (`user.id !== panelData.moderatorId`) | The moderator who opened the panel |
| **Participant / creator split** | `heistHandler` | *Anyone* may join; only the creator may start or cancel |

The user ID is embedded in the custom ID (`rehome_confirm_<userId>`) and compared on press. That works, but it
is **hand-written in each handler and forgotten in most** — any user can currently press another user's shop
buttons.

**In the rewrite this becomes declarative:** `ownerOnly: true` on the handler, enforced by the router once.

---

## 5. Where the bot still makes users type things

The gaps to close. This is the actionable half of the document.

### 5.1 Music has **zero** interactive components — the biggest opportunity

Verified: there is **not one `ButtonBuilder`, select menu or modal** anywhere in `src/prefix/Music/` (21
commands) or `src/commands/Music/` (2 commands). Every action is a separate typed command: `t?skip`,
`t?pause`, `t?resume`, `t?volume 50`, `t?queue`, `t?loop`.

Music is the single most obvious candidate for a control panel, and it is the one feature with none:

```
Now Playing  ─────────────────────────────
♪ Song Title — Artist            3:14 / 4:02
Requested by @user      ▬▬▬▬▬▬▬▬▬━━━━━━━━

[⏮ prev] [⏸ pause] [⏭ skip] [🔁 loop] [⏹ stop]
[🔀 shuffle] [🔉 vol-] [🔊 vol+] [📄 queue]
```

Everything needed already exists — DisTube exposes `queue.pause()`, `.resume()`, `.skip()`, `.setVolume()`,
`.setRepeatMode()`. The panel updates on the DisTube `playSong` / `addSong` / `finish` events, which are
already wired in `client/distubeClientEvent.js`. **Queue browsing should be a paginated select menu**, and
`t?play` remains typed (a search query genuinely is free text).

### 5.2 Commands with many typed options that should be forms or menus

| Command | Typed options | Should be |
|---|---:|---|
| `/treasureconfig` | **11** | A settings panel: current values in an embed, buttons per field opening single-field modals |
| `/lottery` | **9** | Same — a config panel with a modal per setting |
| `/gamble` | 5 | Bet amount via modal, game choice via buttons |
| `/heist` | 2 | Heist type via select menu (the lobby is already buttons) |
| `/pet` | 1 | Already has buttons via `petInteractions` — the typed path is redundant |
| `/deposit`, `/withdraw`, `/transfer` | 1–2 | Keep typed, but add **quick-amount buttons**: `[25%] [50%] [All]` |

`/treasureconfig` is the clearest case: eleven options on one command means nobody discovers nine of them.

### 5.3 Autocomplete is barely used — only 3 commands

`clashRoyale`, `dbd` and `valorantCommands` implement `autocomplete`; `use` declares one option with it.

**Autocomplete is the right tool when the list is too long for a 25-option select menu** — item names, perk
names, song queue positions. It is the middle ground between typing an ID and clicking a button, and it is
under-used. Anywhere the user currently types a name that the bot knows, add it.

### 5.4 Only 55 `update()` against 130 `reply()`

Many handlers post a *new* message where they should mutate the existing one. Every "you bought it!" that
arrives as a fresh reply is a message the user has to scroll past. Default to `update()`; use `reply()` with
`ephemeral` only for errors and private confirmations.

---

## 6. Two dispatch mechanisms — pick one

**Global `interactionCreate` listeners (27)** — the dominant pattern. Persist across restarts, no timeout, but
they fan out to every listener on every interaction, and each one hand-matches its own custom ID.

**Scoped collectors (7)** — `commands/Community/calculator.js`, `AuditLogging/auditLogging.js`,
`Valorant/valorantCommands.js`, `InfoCommands/avatar.js`, `MiniGames/minigame.js`,
`prefix/InfoCommands/botInfo.js`.

Collectors are appropriate for genuinely short-lived, self-contained interactions — a calculator session, a
one-off setup wizard. But three of the seven are used incorrectly:

- **`prefix/InfoCommands/botInfo.js`** — `createMessageComponentCollector()` with **no `time`, no `filter`, no
  `componentType`, no `end` handler.** It never expires, leaks the message and its closure forever, and any
  user can drive it.
- **`commands/InfoCommands/avatar.js`** — `await createMessageComponentCollector()` with no options either
  (and the `await` is meaningless; it returns a collector, not a promise).
- **`MiniGames/minigame.js`** — a bare collector with no filter.

**Rule for the rewrite:** the router is the default. Use a collector only when the interaction is genuinely
ephemeral and self-contained, and then **always** set `time`, `filter`, `componentType` and an `end` handler
that disables the components.

---

## 7. Target design

### 7.1 Screens, not handlers

The insight that makes the shop pattern reusable: a drill-down is a **stack of screens**, each a pure function
from state to a rendered message. The nav-row duplication between `shop.js` and `shopInteractions.js` exists
precisely because there is no such abstraction today.

```ts
// src/ui/screen.ts
export interface Screen<S> {
  render(state: S, ctx: RenderContext): { embeds: EmbedBuilder[]; components: ActionRowBuilder[] };
}

/** The first render (from a command) and every re-render (from a button) call the SAME function. */
export function renderScreen<S>(screen: Screen<S>, state: S, ctx: RenderContext): InteractionUpdateOptions;
```

```ts
// src/features/economy/screens/shopScreen.ts
export const shopScreen: Screen<ShopState> = {
  render({ section, selectedId }, ctx) {
    return {
      embeds: [embed({ category: Category.Economy, title: SECTION_TITLES[section], /* … */ })],
      components: [
        selectRow(Namespace.Shop, 'select', section, catalogueFor(section)),
        navRow(Namespace.Shop, section),        // ← defined ONCE, used by both entry points
      ],
    };
  },
};
```

`commands/economy/shop.ts` then reduces to: resolve the account, `ctx.reply(renderScreen(shopScreen, { section: 'pets' }, ctx))`.
The component handler is `interaction.update(renderScreen(shopScreen, nextState, ctx))`. **One render path.**

### 7.2 State lives in the custom ID

```ts
encodeId(Namespace.Shop, 'select', 'pets', 'legendary')   // "shop:select:pets:legendary"
encodeId(Namespace.Inv,  'page',   '3', userId)           // "inv:page:3:1234…"
```

No module-scope `Map`s, no timers, no regex-parsing of embed footers, no fetching surrounding messages.
Survives restarts. The codec throws above Discord's 100-character limit
([`18-HELPERS-AND-UTILS.md`](18-HELPERS-AND-UTILS.md)).

When state genuinely cannot fit — the heist lobby's participant list — persist it in Mongo keyed by a short ID,
not in memory. That also fixes orphaned heists surviving restarts.

### 7.3 Declarative ownership

```ts
export const rehomeHandler: ComponentHandler = {
  namespace: Namespace.Pet,
  type: 'button',
  ownerOnly: true,                       // router enforces; no hand-written comparison
  async handle(ctx, action, [petId]) { … },
};

export const heistHandler: ComponentHandler = {
  namespace: Namespace.Heist,
  type: 'button',
  access: { join: 'anyone', start: 'creator', cancel: 'creator' },   // per-action
  async handle(ctx, action, [heistId]) { … },
};
```

### 7.4 Reusable builders

Add to `ui/components.ts` (see [`18-HELPERS-AND-UTILS.md`](18-HELPERS-AND-UTILS.md)):

```ts
export function confirmRow(ns: Namespace, action: string, ...args: string[]): ActionRowBuilder;
export function navRow(ns: Namespace, current: string, sections: readonly string[]): ActionRowBuilder;
export function backRow(ns: Namespace, target: string, ...args: string[]): ActionRowBuilder;
export function selectRow<T>(ns, action, items: T[], opts: { label; value; description?; emoji? }): ActionRowBuilder;
export function quickAmountRow(ns: Namespace, action: string, max: number): ActionRowBuilder;  // [25%][50%][All]
export function disableAll(rows: ActionRowBuilder[]): ActionRowBuilder[];                      // on timeout/expiry
```

### 7.5 A modal-form helper

The mod panel's conditional field building is worth generalising, since it is how `/treasureconfig` and
`/lottery` should work too:

```ts
export function modalForm(o: {
  ns: Namespace; action: string; args?: string[]; title: string;
  fields: { id: string; label: string; style?: TextInputStyle; required?: boolean;
            placeholder?: string; maxLength?: number; value?: string }[];
}): ModalBuilder;
```

Pre-filling `value` with the current setting turns any config command into an editable form — which is exactly
what an 11-option `/treasureconfig` should be.

---

## 8. Checklist for the rewrite

**Preserve:**
- [ ] The shop drill-down, as the model for every catalogue
- [ ] Confirm/cancel on all destructive actions
- [ ] `/eval`'s risk-sensitive confirmation
- [ ] The mod panel's conditional modal fields
- [ ] The heist lobby, including `setDisabled` until minimum players
- [ ] Follow-through buttons that chain into the next feature
- [ ] Ownership guards — extended to *every* handler, not the current nine

**Fix:**
- [ ] Nav row built twice in the shop — one shared `navRow()`
- [ ] Three pagination implementations → one `ui/pagination.ts`
- [ ] Pagination state out of embed footers, channel-message scraping and `client.helpData`
- [ ] The four unnamespaced custom IDs (`verify`, `captchaenter`, `vermodal`, `refresh`)
- [ ] The unbounded `back-` namespace and the `spotify-*` double-claim
- [ ] The three collectors with no `time`/`filter`/`end`
- [ ] Dead `pet_check_` branch in `shopInteractions.js`

**Add:**
- [ ] **A music control panel** — the single biggest UX win available
- [ ] A paginated queue browser
- [ ] Settings panels for `/treasureconfig` (11 options) and `/lottery` (9)
- [ ] Quick-amount buttons on deposit/withdraw/transfer
- [ ] Autocomplete anywhere the user types a name the bot already knows
- [ ] `disableAll()` on every expiring message, so dead buttons look dead
