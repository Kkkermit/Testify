# 01 — Current Interaction Patterns

What the bot does today with buttons, select menus and modals. These are the patterns worth preserving.

---

## 1. By the numbers

| Primitive | Count |
|---|---|
| `new ButtonBuilder()` | 161 across 40 files |
| Select menus (`String` / `User`) | 30 |
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

**`/shop pets` never asks for an ID.** Four levels, each re-rendering the *same message* via
`interaction.update()`:

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

### Five properties that make it feel seamless

1. **No ID is ever typed.** The pet ID exists only inside a custom ID the bot mints.
2. **One message, mutated.** `update()` rather than `reply()` — no channel spam.
3. **Every screen has a way back.** `shop_nav_pets` acts as Back at two different depths.
4. **Lateral navigation persists.** The nav row survives, so you can jump from pets to jobs without
   re-running the command.
5. **The flow chains into the next feature.** Adopting hands you a button that lands in an entirely different
   handler — the user never returns to a command picker.

The item, house, business and job branches follow the same shape:
`shop_select_*` → detail → `shop_buy_*_<id>` confirm.

> **Two defects to fix rather than copy.**
> **(a)** The nav row is built **twice** — in `commands/Economy/shop.js` for the first render and again in
> `events/EconCommandEvents/shopInteractions.js` for every re-render. ~30 duplicated lines kept in sync by hand.
> **(b)** `shopInteractions.js` contains a `pet_check_` branch that is **unreachable**, because the file guards
> on `customId.startsWith('shop_')` at the top. The button still works — `petInteractions.js` handles it — but
> the dead branch is misleading.

---

## 3. The six archetypes

### 3.1 Drill-down browser
`shop` (items · houses · businesses · jobs · pets) · `help` (category → page → command)

Catalogue → select → detail → confirm, always via `update()`. **The pattern for anything with a list.**

### 3.2 Confirm / cancel on destructive actions
`rehome_confirm_<userId>` / `rehome_cancel_<userId>` · `reset_user_confirm_<id>` /
`reset_server_confirm_<id>` / `reset_cancel` · `lottery_disable_confirm_<guildId>` /
`lottery_disable_cancel_<guildId>` · `eval_continue_<userId>` / `eval_cancel_<userId>`

Never destroy data on the first click.

The `/eval` variant is the most interesting: `evalEvent.js` **scans the submitted code for token and Mongo-URI
patterns and only demands confirmation when the code looks risky.** A context-sensitive confirm — worth
preserving, and worth generalising.

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

**Strictly better than slash options:** no 25-option limit, multi-line paragraph input, and the form adapts to
what was pressed. Also used by `/eval`, `/bug-report`, `/suggest`, `/say`, and the DM-response flow.

### 3.4 Multi-user lobby
`heist_join_<heistId>` / `heist_start_<heistId>` / `heist_cancel_<heistId>`

A shared message multiple users interact with. The embed re-renders with the participant list on each join, and
**Start is `.setDisabled()` until the minimum player count is met** — the UI enforces the rule rather than
erroring after the fact. Join is open to anyone; start and cancel are creator-only.

### 3.5 Pagination
`inventory_prev` / `inventory_next` · `guildlist-<action>-<userId>` · `help_page_<…>`

**Three separate implementations, all with state-recovery problems:**

| Where | How state is recovered | Problem |
|---|---|---|
| `inventoryPagination.js` | Regex-parses `Page (\d+)/(\d+)` from the embed footer when the in-memory map misses | Schedules a **new** 5-minute timeout on *every* press |
| `guildListPaginationEvent.js` | **Fetches 10 surrounding channel messages and regex-parses a JSON blob out of a bot message** | Extremely fragile |
| `helpInteractions.js` | Reads the global `client.helpData` | **One global slot — two users overwrite each other** |

All three are solved identically: **put the page number in the custom ID.**

### 3.6 Refresh / re-roll in place
`minecraft-refresh_<ip>` · `dbd_reroll_<role>` · `spotify-<type>-<userId>-<timeRange>` ·
`skin-preview_<type>_<uuid>_<idx>`

A button that re-runs the query and updates the same message. Cheap, and it makes a static embed feel alive.
`spotify` is the nicest: three buttons switch between tracks/artists/albums *and* the time range without
re-invoking the command.

---

## 4. Ownership — who may press

Nine handlers check; the rest don't. **Three distinct rules are in use, and the distinction is real:**

| Rule | Used by | Meaning |
|---|---|---|
| **Invoker only** | `inventoryPagination`, `guildListPaginationEvent`, `petInteractions` (rehome), `evalEvent` | Private to whoever ran the command |
| **Role-holder only** | `modPanelButtonHandler` — `user.id !== panelData.moderatorId` | The moderator who opened the panel |
| **Participant / creator split** | `heistHandler` | *Anyone* may join; only the creator may start or cancel |

The user ID is embedded in the custom ID (`rehome_confirm_<userId>`) and compared on press.

**The problem:** it is hand-written per handler and **omitted in most.** Any user can currently press another
user's shop buttons, drive their pet, or navigate their help menu.

---

## 5. Two competing dispatch mechanisms

### Global `interactionCreate` listeners — 27
The dominant pattern. Persist across restarts, never time out. But every interaction fans out to all 27
listeners, and each hand-matches its own custom ID with `startsWith` or `===`.

### Scoped collectors — 7 files
`commands/Community/calculator.js` · `AuditLogging/auditLogging.js` · `Valorant/valorantCommands.js` ·
`InfoCommands/avatar.js` · `MiniGames/minigame.js` · `prefix/InfoCommands/botInfo.js`

Appropriate for genuinely short-lived, self-contained interactions. **Three of the seven are used incorrectly:**

| File | Problem |
|---|---|
| `prefix/InfoCommands/botInfo.js` | `createMessageComponentCollector()` with **no `time`, no `filter`, no `componentType`, no `end` handler**. Never expires, leaks the message and closure forever, and any user can drive it |
| `commands/InfoCommands/avatar.js` | `await createMessageComponentCollector()` — no options, and the `await` is meaningless (it returns a collector, not a promise) |
| `commands/MiniGames/minigame.js` | Bare collector, no filter |

**Rule for the rewrite:** the router is the default. Use a collector only when the interaction is genuinely
ephemeral and self-contained, and then **always** set `time`, `filter`, `componentType`, and an `end` handler
that disables the components.
