# The UI/UX rewrite

Instructions for reworking the dashboard's look and feel. Written to be executed in order by somebody — or some
Claude session — arriving with no memory of the discussion that produced it.

> [!IMPORTANT]
> **This is a restyle, not a rebuild.** Every route, every API call, every write shape and every security
> boundary stays exactly as it is. If a step in here would change what a screen _does_, it has gone wrong.

---

## Contents

1. [Which document wins](#1-which-document-wins)
2. [What must not change](#2-what-must-not-change)
3. [The baseline, measured](#3-the-baseline-measured)
4. [What "better" means, and how it is proved](#4-what-better-means-and-how-it-is-proved)
5. [Phase 0 — fix what is broken](#5-phase-0--fix-what-is-broken)
6. [Phase 1 — direction](#6-phase-1--direction)
7. [Phase 2 — hierarchy](#7-phase-2--hierarchy)
8. [Phase 3 — screen by screen](#8-phase-3--screen-by-screen)
9. [Phase 4 — prove it and write it down](#9-phase-4--prove-it-and-write-it-down)
10. [The per-screen checklist](#10-the-per-screen-checklist)
11. [Which skill to reach for](#11-which-skill-to-reach-for)
12. [How to verify anything](#12-how-to-verify-anything)
13. [How to abandon it](#13-how-to-abandon-it)

---

## 1. Which document wins

Four sources of design guidance now exist in this repository, and they will disagree. The order is settled:

| Rank | Source                                                           | Governs                                                      |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | [`../CLAUDE.md`](../CLAUDE.md) §16, §22, §24                     | Architecture, security, data. **Never overridden by taste**  |
| 2    | [`dashboard.md`](dashboard.md) §9, §14                           | The security boundary and the accessibility floor            |
| 3    | The skills in [`../.claude/skills`](../.claude/skills/README.md) | Aesthetic direction — palette, type, composition, motion     |
| 4    | [`dashboard.md`](dashboard.md) §20 — the 58 rules                | The worklist, and the tie-breaker when the skills are silent |
| 5    | [`dashboard.md`](dashboard.md) §18                               | **A baseline to rewrite against, not a contract to defend**  |

So: a skill may change every value in `@theme`; it may not put a hex in a `.tsx`, because that is rank 1. A
skill may propose a lighter muted text; it may not take it below 4.5:1, because that is rank 2.

**When a skill and the 58 rules disagree, the skill wins** — it is the more specific instrument. Record the
disagreement in the commit message so the next person knows it was a decision.

---

## 2. What must not change

Read this list before touching anything. Each of these has a test that will fail, or a real incident behind it.

**Architecture**

- **Tokens stay the single source.** Every colour, radius and duration comes from `@theme` in `index.css`. A
  hex value in a `.tsx` is a review comment (§18.1). This is what makes the rewrite possible at all.
- **`Card` owns padding, `AppShell` owns rhythm.** All three card paddings keep the same inline value, or
  content stops starting on the same column (§18.6).
- **`components/primitives` before a local copy.** Three files with their own segmented control is three places
  to fix an `aria-pressed` bug (§11).
- **A page holds routing, loading and error branches only.** Rules live in a `.utils.ts` beside it (§19.12).

**Accessibility — the floor only rises**

- Every page-level test runs `jest-axe`. Do not disable a rule to make a design pass.
- 24px minimum target size (WCAG 2.2 AA). The back link on the member page was 196×20 and had to be fixed.
- `sr-only`, never `hidden`, for labels at the icon-only rail — `display: none` removes them from the
  accessibility tree and every nav link becomes nameless.
- `RouteAnnouncer` stays. Without it a screen reader gets no signal that an SPA changed page.
- `prefers-reduced-motion` must remove all motion, and nothing may become harder to use when it does.
- `prefers-contrast: more` stays wired.

**Security**

- No `dangerouslySetInnerHTML`, no `innerHTML`, no inline `<script>`, no `eval`. The CSP has no
  `'unsafe-inline'` for scripts and that is what makes an injected `<script>` inert (§9).
- Tooltips set `aria-describedby`, never `aria-labelledby`. A control labelled only by a tooltip is unreachable.
- No new external font, image or script host. The CSP blocks them and a self-hosted bot should not phone out.

**Product**

- **No chart library.** `UsageChart` is a `<span>` per day with a height, and the numbers behind it are a real
  `<table>` in an `sr-only` `<figcaption>`. The bundle budget is the reason.
- Every route in `routes.tsx` keeps its path. Links are shared and bookmarked.
- Nothing moves out of `config/navigation.ts` or `config/features.ts` into a screen.

---

## 3. The baseline, measured

Taken from the repository as it stands, not estimated. Re-run the commands in [§12](#12-how-to-verify-anything)
after the rewrite and compare.

| Thing                          | Today                                                     |
| ------------------------------ | --------------------------------------------------------- |
| Routes                         | 21                                                        |
| Feature directories            | 16                                                        |
| Components and pages (`.tsx`)  | 105                                                       |
| Primitives                     | 17                                                        |
| Dashboard test files / tests   | 54 / 640                                                  |
| First-load JS, gzipped         | **159 kB** (`vendor` 150 kB + `index` 9 kB)               |
| CSS, gzipped                   | **8.9 kB**                                                |
| three.js                       | its own chunk, not in the first load                      |
| Type sizes in use              | 5 (`2xl` ×4, `lg` ×12, `base` ×29, `sm` ×100, `xs` ×51)   |
| Spacing values in use          | `gap-3` 71, `gap-4` 48, `gap-2` 45, `gap-1` 25, `gap-6` 7 |
| 58 rules held / to apply / N/A | 32 / 17 / 9                                               |

### Contrast, computed

The gap §20 rule 29 named. `jest-axe` runs with `color-contrast` **disabled** — jsdom computes no styles — so
nothing had ever checked these. Computed from the real tokens:

| Pair                          | Ratio        | Verdict                           |
| ----------------------------- | ------------ | --------------------------------- |
| `foreground` on `background`  | 19.75:1      | AAA                               |
| `muted-foreground` on `card`  | 7.35:1       | AAA                               |
| `accent` on `background`      | 7.26:1       | AAA                               |
| `white` on `primary`          | 5.70:1       | AA                                |
| every `feature-*` on `card`   | 6.74–11.16:1 | AA or better                      |
| `input` border on `card`      | 3.66:1       | passes 3:1 for a control boundary |
| **`primary` on `background`** | **3.47:1**   | **fails AA for text**             |
| **`destructive` on `card`**   | **3.86:1**   | **fails AA for text**             |

The palette is in far better shape than "unverified" suggested — but the last two rows are a live conformance
failure, which is Phase 0.

---

## 4. What "better" means, and how it is proved

A rewrite with no exit criteria is churn. These are the criteria. **All of them are checkable.**

| Claim                      | Proof                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| It is more accessible      | Every token pair ≥ 4.5:1 for text, ≥ 3:1 for controls. `jest-axe` still clean. `accessibility-scan` and `accessibility-inspect` clean on six pages |
| It is no slower            | First-load JS ≤ **159 kB** gzipped, CSS ≤ **12 kB**. `npm run verify:bundle` passes                                                                |
| It is not more complicated | Type sizes ≤ 5, spacing values ≤ 5, primitives ≤ 20. No new dependency                                                                             |
| Nothing broke              | `npm run check` green, 640 dashboard tests still passing, every route still reachable                                                              |
| It works everywhere        | The browser sweep clean at 1440 / 820 / 390 — no sideways scroll, no unnamed control, no sub-24px target                                           |
| It is measurably different | Before/after screenshots of all 21 routes, and §20's "Apply" count down from 17                                                                    |
| It is documented           | §18 updated to describe what was built, not what used to be there                                                                                  |

> [!WARNING]
> **If the bundle grows or a contrast ratio falls, the rewrite has failed its own test** — regardless of how it
> looks. Fix it or revert that step.

---

## 5. Phase 0 — fix what is broken

Do this before any restyling. It is a bug fix, not a taste decision, and it is covered by "the accessibility
floor only rises" — so it stands whatever the rewrite decides afterwards.

**`text-primary` is used as 14px body text in five places and measures 3.47:1 against the page background.**
WCAG AA wants 4.5:1 for text under 18.66px. The same applies to `text-destructive` on a card at 3.86:1.

```
features/guilds/GuildCard.tsx:53           text-primary … text-sm
features/owner/components/GuildDetail.tsx:68   text-primary … text-sm
features/owner/tabs/RuntimeTab.tsx:49          text-primary … text-sm
features/owner/components/OwnerGuildTable.tsx:54  hover:text-primary
features/members/components/BoardTable.tsx:46     hover:text-primary
features/owner/components/LogLines.tsx:8-9     text-destructive
components/primitives/Badge.tsx:8              text-destructive
```

The contained fix, which touches no button: **links and inline emphasis read `--color-accent`** (`#a78bfa`,
7.26:1 on background, 6.85:1 on card), leaving `--color-primary` for filled surfaces where the pairing that
matters is white-on-primary at 5.70:1. For `text-destructive` as text, either lighten the token or use it only
as a fill with `foreground` text, the way `Badge`'s other tones already work.

Then add the contrast check to the suite so it cannot regress — a pure function over the token values, run in
Jest, is enough and needs no browser.

**Exit:** every token pair used as text is ≥ 4.5:1, with a test that fails if one drops.

---

## 6. Phase 1 — direction

The part that decides what it looks like. **Do not start in a component.**

1. **Read `dashboard.md` §18 end to end.** It is the baseline; you need to know what you are changing.
2. **Invoke `frontend-design` and `bencium-innovative-ux-designer`** for the aesthetic direction. Ask for a
   direction, not for code: what this dashboard should feel like for somebody administering a Discord bot.
   Rule 41 is the honest brief — today it reads as a competent Tailwind dashboard and nothing more.
3. **Then `uiux-design-system`** for the token architecture, and `typography` for the type scale. Typography's
   enforcement mode applies automatically to any markup produced from here on.
4. **Rewrite `@theme` in `index.css` only.** No component changes yet. Every screen will move, which is the
   point of tokens.
5. **Work through §18.10's checklist**, which exists for exactly this moment. It names the four things that
   cannot read a token — the select chevron's hardcoded `%23a1a1b5`, the body wash geometry, the tippy theme
   block, and the `prefers-contrast: more` remap.
6. **Re-run the contrast table.** Any pair below its threshold is a token to change, not a rule to waive.

**Exit:** the palette, radii, type scale and motion tokens are new; not one `.tsx` has changed; the app still
builds; contrast passes; screenshots of all 21 routes taken for comparison.

---

## 7. Phase 2 — hierarchy

The biggest single win, and mostly a matter of demoting things. §20 rules 9, 10, 21 and 34 are one problem:
**every card weighs the same and several offer a primary button, so no screen says what to do first.**

1. **One primary action per screen.** Everything else becomes `secondary` or `ghost`. Where two actions
   genuinely compete, the screen probably wants splitting.
2. **Give each page a focal point** — usually the thing the page is named after. The overview's feature grid
   already does this; the settings page, with seven equal sections, does not.
3. **Use the F-pattern for the tables and lists** (members, blacklist, logs, the fleet table): the identifying
   column left, the action right, the scanning weight top-left. The Z-pattern does not apply to a settings form
   and should not be forced onto one.
4. **Apply the 60–30–10 balance** (rule 31). Measure it before deciding: the page is roughly 95% background and
   card today, and the accent barely appears.
5. **Progressive disclosure on the settings page** (rule 20) — seven sections at once is the densest screen in
   the app.

Invoke `design-audit` here: it produces a phased, implementation-ready plan from what exists, which is exactly
this phase's shape.

**Exit:** on every screen, a stranger can say what the page is for and what to do first, without reading the
body copy.

---

## 8. Phase 3 — screen by screen

Order matters. Do the shell first — everything inherits it — then the most-used screens, then the rest. Each
one is a commit.

| Order | Screen                             | Why here                                                       |
| ----- | ---------------------------------- | -------------------------------------------------------------- |
| 1     | `AppShell`, `Sidebar`, `MobileNav` | Every page sits inside it; three widths to check               |
| 2     | Primitives (`Card`, `Button`, …)   | Change once, land everywhere. Do not add a new one yet         |
| 3     | `/sign-in` and the setup screen    | The first thing anybody ever sees, and it has no sidebar       |
| 4     | `/guilds` and `/guilds/:id`        | The two most-visited screens                                   |
| 5     | `/guilds/:id/settings`             | Densest, and rule 20's worked example                          |
| 6     | `/guilds/:id/levelling`, `welcome` | The tab pattern and the typed-field pattern                    |
| 7     | `/guilds/:id/members` and detail   | The table pattern, and the only screen that writes to a person |
| 8     | The remaining guild settings       | Mechanical once 5 and 6 are done                               |
| 9     | `/owner` (eight tabs)              | Most surface, least traffic. Last for a reason                 |
| 10    | `/commands`, `/terms`, `/privacy`  | Public and read-only                                           |

---

## 9. Phase 4 — prove it and write it down

1. **The full verification set** in [§12](#12-how-to-verify-anything), all of it.
2. **`accessibility-audit`** across the sampled routes — the manual tier `jest-axe` cannot reach.
3. **`web-design-guidelines`** as a final review pass over the changed code.
4. **Update `dashboard.md` §18** so it describes what was built. It is the baseline for the _next_ person.
5. **Update §20's verdicts.** Every rule moved from Apply to Held gets its note rewritten. If the Apply count
   has not fallen, say so rather than quietly leaving it.
6. **Update the screenshots** referenced by the README.

---

## 10. The per-screen checklist

One screen is done when all of this is true. Copy it into the commit message if it helps.

- [ ] Reads only tokens — no hex, no arbitrary radius, no bare `duration-*`
- [ ] Exactly one primary action; everything else is secondary or ghost
- [ ] All six states exist: loading, empty, error, refused, saving, busy (§19.1)
- [ ] A refusal renders **beside its control**, not at the top of the page
- [ ] `PageHeader` with one `<h1>`; headings descend without skipping
- [ ] Every control has an accessible name; every input has a real `<label>`
- [ ] Targets ≥ 24px; no sideways scroll at 390px
- [ ] `jest-axe` clean; existing tests still pass unchanged
- [ ] Motion is feedback only, and the screen loses nothing under `prefers-reduced-motion`
- [ ] Copy is sentence case, British spelling, and says what to do next (§19.11)
- [ ] Screenshot taken at 1440 and 390 for the before/after set

---

## 11. Which skill to reach for

| Situation                                  | Skill                                                                |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Deciding what it should feel like          | `frontend-design`, `bencium-innovative-ux-designer`                  |
| Token architecture and scales              | `uiux-design-system`                                                 |
| Type: quotes, dashes, spacing, hierarchy   | `typography` — applies itself to any markup you generate             |
| Auditing a screen that exists              | `design-audit`, `web-design-guidelines`                              |
| Component structure while restyling        | `composition-patterns`                                               |
| Rendering or re-render trouble             | `react-best-practices`                                               |
| Contrast, focus order, screen-reader names | `accessibility-scan` → `accessibility-inspect` → `accessibility-fix` |
| Did this change break accessibility        | `accessibility-diff`                                                 |
| The whole-product conformance pass         | `accessibility-audit`                                                |

Not for this repository, despite being present: `uiux-banner-design`, `uiux-slides`, `uiux-brand`. They are
about social banners, decks and logo generation. Their presence is not an argument for a chart library.

---

## 12. How to verify anything

```bash
npm run check                 # typecheck, lint, format, 2878 tests across both projects
npm run test:coverage         # the 80/80/80/80 gates
npm run build                 # includes verify:bundle — fails on a second React copy
```

**Bundle, gzipped** — the number that must not grow:

```bash
for f in dashboard/dist/assets/*.js dashboard/dist/assets/*.css; do
  printf "%s %s\n" "$(basename "$f")" "$(gzip -c "$f" | wc -c | awk '{printf "%.1f kB", $1/1024}')"
done
```

**Contrast** — after every palette change, and it belongs in the test suite after Phase 0:

```bash
node -e '
const lum=h=>{h=h.replace("#","");const c=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255)
  .map(x=>x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4));
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const r=(a,b)=>{const [x,y]=[lum(a),lum(b)];return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
console.log(r("#a78bfa","#0a0a0f").toFixed(2));'
```

**The browser sweep** — jsdom computes no layout, so this is the only thing that measures a real page. The
pattern used throughout this repo: start Vite, route `**/api/**` to fixtures with Playwright, then per width
count sideways scroll, `<h1>`s, controls with an empty accessible name, inputs with no `<label>`, and any
target under 24px. Run it at 1440, 820 and 390. It has found things every single time — a 196×20 link, a reason
column truncated to "Spam…", and a JSX parse error that type-checked.

---

## 13. How to abandon it

Phase 1 is one file. If the direction is wrong, `git revert` the token commit and everything returns — that is
the whole point of doing tokens first and components second.

Phases 2 and 3 are a commit per screen, so a screen that went wrong reverts on its own without taking the rest
with it. Nothing here touches the API, the schemas or the tests, so a revert cannot leave the bot in a state
the dashboard disagrees with.
