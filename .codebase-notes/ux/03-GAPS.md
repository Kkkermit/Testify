# 03 — Where the Bot Still Forces Typing

The actionable half of this section. Each gap is a place where the user must type something the bot already
knows.

---

## 1. Music has **zero** interactive components — the biggest opportunity

**Verified:** there is not one `ButtonBuilder`, select menu or modal anywhere in `src/prefix/Music/`
(21 commands) or `src/commands/Music/` (2 commands).

Every action is a separate typed command:

```
t?play <query>    t?skip      t?pause     t?resume    t?stop
t?queue           t?volume 50 t?loop      t?shuffle   t?nowplaying
t?seek 1:30       t?forward   t?rewind    t?previous  t?autoplay
t?skipto 3        t?playtop   t?playskip  t?filter    t?join   t?leave
```

**21 commands where a single panel would do.** Music is simultaneously the most interaction-heavy feature by
usage and the only one with no interaction components at all.

Everything needed already exists:

| Need | Already available |
|---|---|
| Playback control | DisTube exposes `queue.pause()`, `.resume()`, `.skip()`, `.previous()`, `.setVolume()`, `.setRepeatMode()`, `.shuffle()`, `.stop()` |
| Panel refresh triggers | `playSong`, `addSong`, `addList`, `finish`, `empty` — all already wired in `client/distubeClientEvent.js` |
| Queue data | `client.distube.getQueue(guildId)` |

`t?play <query>` should **stay typed** — a search query is genuinely free text. Everything else becomes a
button. Full blueprint in [`05-FEATURE-BLUEPRINTS.md`](05-FEATURE-BLUEPRINTS.md#1-music-control-panel).

---

## 2. Commands with too many typed options

| Command | Typed options | Should be |
|---|---:|---|
| **`/treasureconfig`** | **11** | A settings panel — current values in an embed, one button per field opening a single-field modal pre-filled with the current value |
| **`/lottery`** | **9** | Same pattern |
| `/gamble` | 5 | Game choice via buttons; bet amount via modal or quick-amount buttons |
| `/heist` | 2 | Heist type via select menu (the lobby is already buttons) |
| `/pet` | 1 | Already fully button-driven via `petInteractions` — the typed path is redundant |
| `/deposit` `/withdraw` `/transfer` | 1–2 | Keep typed, but add quick-amount buttons: `[25%] [50%] [All]` |

`/treasureconfig` is the clearest case: **eleven options on one command means nobody discovers nine of them.**
A settings panel makes every option visible at once and shows the current value beside each.

---

## 3. Autocomplete is barely used — 3 commands

Only `commands/Community/clashRoyale.js`, `commands/Community/dbd.js` and
`commands/Valorant/valorantCommands.js` implement `autocomplete`. `commands/Economy/use.js` declares one
option with it, served from a separate file (`events/EconCommandEvents/itemAutocomplete.js`).

**Autocomplete is the right tool when the list is too long for a 25-option select menu.** It is the middle
ground between typing a raw ID and clicking a button, and it is badly under-used:

| Candidate | Currently |
|---|---|
| Item names in `/use`, `/shop` | Partially — `/use` only |
| Pet names for rename | Typed |
| Song position for `t?skipto` | Typed number |
| Perk names in `/dbd` | ✅ already |
| Role/channel names in config commands | Typed or option pickers |
| Warning IDs in `/warn info|edit|remove` | **Typed IDs — the exact pattern to eliminate** |

`/warn` is worth calling out: `/warn info <warnId>` makes the user copy a generated ID out of a previous embed.
That is precisely the `/pet-shop <id>` problem, and it should be a select menu of that user's warnings.

---

## 4. `reply()` outnumbers `update()` more than two to one

**130 `reply()` against 55 `update()`** in event handlers.

Many handlers post a *new* message where they should mutate the existing one. Every "you bought it!" that
arrives as a fresh message is something the user scrolls past, and it breaks the illusion of a single
interactive panel.

**Rule:** default to `update()`. Use `reply({ ephemeral: true })` only for errors and private confirmations
that genuinely should not replace the panel.

---

## 5. Ownership guards missing on most handlers

Only 9 of ~27 component handlers check who pressed the button. In practice this means **any user can press
another user's shop buttons, drive their pet, or page through their inventory.**

Not a security issue — the actions still validate against the presser's own account in most cases — but it is
confusing, and in the pet and inventory flows it lets one user mutate another's view.

Fixed declaratively in [`04-TARGET-DESIGN.md`](04-TARGET-DESIGN.md#3-declarative-ownership).

---

## 6. Expired components stay enabled

No handler calls anything like `disableAll()` when a session ends. Timed-out heist lobbies, finished blackjack
hands and abandoned shop sessions all leave live-looking buttons that do nothing or error.

**Rule:** on timeout or completion, re-render with every component `.setDisabled(true)`. A dead button should
look dead.

---

## Priority

| Priority | Gap | Rationale |
|---|---|---|
| **1** | Music control panel | 21 commands collapse to one panel; biggest single UX win |
| **2** | `/treasureconfig` and `/lottery` settings panels | 20 typed options between them, mostly undiscovered |
| **3** | Ownership guards everywhere | Cheap once declarative; fixes cross-user interference |
| **4** | `disableAll()` on expiry | Cheap; removes a whole class of confusion |
| **5** | Quick-amount buttons on economy transfers | Small, high-frequency ergonomics win |
| **6** | Autocomplete for `/warn` IDs and item names | Removes the last typed-ID paths |
| **7** | Invert the `reply`/`update` ratio | Ongoing, per-handler as features are ported |
