# 05 — Feature Blueprints

Concrete proposed flows for the gaps in [`03-GAPS.md`](03-GAPS.md), in priority order.

These are designs, not specifications — adjust the layouts to taste. What matters is the shape: no typed IDs,
one mutated message, a way back, and confirmation before anything destructive.

---

## 1. Music control panel

**The single biggest UX win available.** Replaces ~15 of the 21 prefix music commands with one panel.

```
┌────────────────────────────────────────────────────┐
│ ♪  Now Playing                                     │
│                                                    │
│    Never Gonna Give You Up                         │
│    Rick Astley  ·  3:14 / 3:33                     │
│    ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬━━━━━                          │
│                                                    │
│    Requested by  @user                             │
│    🔊 60%   🔁 Off   ⏭ 4 in queue                  │
└────────────────────────────────────────────────────┘
 [⏮]  [⏸]  [⏭]  [⏹]  [🔁]
 [🔉]  [🔊]  [🔀]  [📄 Queue]  [🎚 Filters]
```

| Custom ID | Action |
|---|---|
| `music:prev` | `queue.previous()` |
| `music:playpause` | Toggles `queue.pause()` / `.resume()` — the button label and emoji flip |
| `music:skip` | `queue.skip()` |
| `music:stop` | `queue.stop()` — **confirm first**, it destroys the queue |
| `music:loop` | Cycles off → song → queue; the button label shows the current mode |
| `music:vol:down` · `music:vol:up` | ±10%, disabled at the bounds |
| `music:shuffle` | `queue.shuffle()` |
| `music:queue:0` | Opens the paginated queue browser |
| `music:filters` | Opens a filter select menu |

**Panel lifecycle:**
- `t?play` / `/play` posts the panel and stores its message ID on the queue
- The existing DisTube `playSong`, `addSong`, `addList`, `finish` handlers in
  `client/distubeClientEvent.js` edit it in place — **already wired, nothing new needed**
- On `finish` / `empty`, `disableAll()` and update to "Queue ended"
- Throttle edits to at most once every few seconds so a long queue doesn't hit rate limits

**Queue browser** — `music:queue:<page>`:

```
📄  Queue — page 1/2                     [◀]  [▶]  [← Back]
 1. Song A — Artist          3:33   @user
 2. Song B — Artist          4:12   @user
 …
                                          [ Jump to… ▾ ]
```

The `Jump to…` select replaces `t?skipto <n>` — the exact typed-index pattern to eliminate. For queues over 25
entries, use autocomplete instead.

**Keep typed:** `t?play <query>` — a search query is genuinely free text.

**Permissions:** anyone in the voice channel may press playback controls; `stop` and `filters` should be
restricted to the requester or a DJ role. Use per-action `access` from
[`04-TARGET-DESIGN.md`](04-TARGET-DESIGN.md#3-declarative-ownership).

---

## 2. Settings panels

Replaces `/treasureconfig`'s **11** typed options and `/lottery`'s **9**.

```
┌────────────────────────────────────────────────────┐
│ ⚙️  Treasure Drops — Settings                       │
│                                                    │
│  Status            🟢 Enabled                       │
│  Messages before    15 – 50                         │
│  Reward amount      $10 – $500                      │
│  Cooldown           5 minutes                       │
│                                                    │
│  Last modified by @user · 2 days ago               │
└────────────────────────────────────────────────────┘
 [Toggle]  [Message Range]  [Reward Range]  [Cooldown]
 [Reset to defaults]                        [Disable]
```

Each field button opens a **modal pre-filled with the current value**:

```
Modal: settings:treasure:edit:range
  Minimum messages   [ 15  ]
  Maximum messages   [ 50  ]
```

On submit: validate, persist, re-render the panel in place.

**Why this is better than 11 slash options:**
- Every setting is visible at once, with its current value
- No one has to remember option names
- Validation errors appear next to the field, not as a failed command
- `Reset to defaults` and `Disable` get confirmation dialogs

**Apply the same pattern to:** `/lottery` (9 options), `/welcome-system`, `/anti-link`, `/automod`,
`/leveling-system`, `/counting`. A shared `settingsPanel()` helper covers all of them, since they are all
"show current config, edit one field, persist, re-render".

---

## 3. Economy quick actions

### Quick-amount buttons on transfers

```
💰  Deposit                            Wallet $1,250  ·  Bank $8,000
 [25% — $312]  [50% — $625]  [All — $1,250]  [Custom…]
```

`Custom…` opens a one-field modal. This covers the common cases in one click and keeps the typed path for the
rest. Same for `/withdraw` and `/transfer` (transfer additionally needs a user, which stays a slash option or
a user-select menu).

### `/warn` — the last typed-ID path

`/warn info <warnId>` currently requires copying a generated ID out of a previous embed. Replace with:

```
⚠️  Warnings for @user                                 3 total
 [ Select a warning ▾ ]
   #a3f9 · Spamming · 2 days ago · by @mod
   #b1c2 · Bad language · 1 week ago · by @mod
```

Selecting one shows the detail with `[Edit] [Remove] [← Back]`. For users with more than 25 warnings, fall back
to autocomplete.

### Pet care

Already button-driven via `petInteractions`. Two additions:
- The `/pet` typed path is redundant — make the panel the only entry point
- Feed/walk buttons should `.setDisabled(true)` with a cooldown label while on cooldown, rather than erroring
  on press

---

## 4. Cross-cutting improvements

### Disable expired components

Every timed flow — heist lobbies, blackjack hands, shop sessions, help menus — should re-render with
`disableAll()` on expiry. Currently they leave live-looking buttons that error.

### Consistent confirmation dialog

One helper for every destructive action:

```ts
confirmDialog(ctx, {
  title: 'Rehome your pet?',
  description: 'This cannot be undone and you will not be refunded.',
  confirmLabel: 'Rehome',
  namespace: Namespace.Pet,
  action: 'rehome',
  args: [petId],
});
```

Already the pattern in `rehome`, `reset` and `lottery disable` — just not shared.

### Ephemeral by default for personal panels

Shop, inventory and settings panels are single-user. Making them ephemeral removes channel clutter and the
cross-user interference in [`03-GAPS.md`](03-GAPS.md#5-ownership-guards-missing-on-most-handlers) entirely.

Keep public: heist lobbies, music panels, giveaways, tickets — anything genuinely multi-user.

---

## 5. Build order

| Order | Item | Why here |
|---|---|---|
| 1 | `ui/components.ts`, `ui/screen.ts`, `ui/pagination.ts`, `modalForm()` | Everything below depends on them (Phase 2) |
| 2 | Port the shop drill-down to screens | Proves the abstraction against the most complex existing flow |
| 3 | Settings panel helper + `/treasureconfig` | First new pattern; small and self-contained |
| 4 | Music control panel + queue browser | Biggest win, but depends on the helpers being proven |
| 5 | Economy quick actions, `/warn` selector | Polish |
| 6 | `disableAll()` and ephemeral sweep | Cross-cutting, once the patterns are settled |

Steps 2–4 map onto Phase 5 of [`../migration/14-MIGRATION-PHASES.md`](../migration/14-MIGRATION-PHASES.md) —
build each feature's screens as you port it, not as a separate pass afterwards.
