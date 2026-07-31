# 8. Design system

Black, purple, and a bit of white — as asked. What follows is a palette with the contrast ratios worked out
rather than asserted, because "dark purple UI" is exactly the theme that usually ships unreadable.

## How the ratios below were produced

WCAG relative luminance: linearise each channel (`c ≤ 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`), then
`L = 0.2126R + 0.7152G + 0.0722B`. Contrast is `(L_lighter + 0.05) / (L_darker + 0.05)`.

The thresholds that matter (WCAG 2.2 AA): **4.5:1** for body text, **3:1** for text 18.66px+ bold or 24px+, and
**3:1** for the visual boundary of any control you need to see to use — input borders, focus rings, toggle
tracks. That last one, 1.4.11, is the one dark themes fail.

Re-verify with any contrast checker before shipping. If you change a colour, change the number here too.

## Palette

### Surfaces

| Token          | Hex       | Use                                                     |
| -------------- | --------- | ------------------------------------------------------- |
| `background`   | `#0A0A0F` | Page. Near-black with a violet cast, not pure `#000`    |
| `card`         | `#12121A` | Cards, sidebar, table rows                              |
| `popover`      | `#1A1A25` | Menus, dialogs, anything floating above a card          |
| `muted`        | `#1A1A25` | Inert fills, skeletons, disabled backgrounds            |
| `border`       | `#26263A` | Decorative rules and card edges                         |
| `input-border` | `#6B6B8F` | **Interactive** outlines — inputs, switches, checkboxes |

Not pure black: `#000` under a bright purple accent produces visible halation, and it leaves nowhere to go for
elevation. Three steps of surface give depth without a single drop shadow.

Two border tokens because they have different jobs. `#26263A` is **1.34:1** against the background — invisible on
purpose, correct for a divider. An input outline at 1.34:1 fails 1.4.11 outright, so controls get `#6B6B8F` at
**3.88:1**. This is the most commonly skipped requirement in dark themes and it is a one-token fix.

### Purple

| Token            | Hex         | On `#0A0A0F`        | Use                                         |
| ---------------- | ----------- | ------------------- | ------------------------------------------- |
| `primary`        | `#7C3AED`   | 3.47:1              | Filled buttons, active nav, switch-on track |
| `primary-fg`     | `#FFFFFF`   | 5.70:1 on `#7C3AED` | Text on a filled purple button              |
| `accent`         | `#A78BFA`   | 7.26:1              | Purple **text**, links, icons, focus rings  |
| `primary-subtle` | `#7C3AED1A` | —                   | 10% tint behind an active row               |

The important finding: **`#8B5CF6` (violet-500) is 4.66:1 on this background — it fails AA for body text.** The
obvious "brand purple" is fine as a fill and fine for large headings, and wrong for the link colour, which is
where a purple theme most wants to use it. Hence two purples: a darker one to sit _behind_ white text (5.70:1,
comfortably AA), and a lighter one to _be_ text (7.26:1, AAA).

### Text

| Token              | Hex       | Ratio  | Use                                 |
| ------------------ | --------- | ------ | ----------------------------------- |
| `foreground`       | `#FFFFFF` | 19.8:1 | Headings, primary values            |
| `foreground-muted` | `#A1A1B5` | 7.79:1 | Labels, descriptions, table headers |

Two levels, not five. "A bit of white" is right: pure white on near-black at 19.8:1 is high contrast, so use it
sparingly — headings and the numbers people came to read. Everything explanatory sits at `#A1A1B5`, which still
clears AA with room to spare.

### Status

| Token     | Hex       | Ratio  | Use                          |
| --------- | --------- | ------ | ---------------------------- |
| `success` | `#34D399` | 10.3:1 | Enabled, saved, healthy      |
| `warning` | `#FBBF24` | 11.8:1 | Missing permission, degraded |
| `danger`  | `#F87171` | 7.14:1 | Destructive actions, errors  |

All three clear AA as text, so a status word can be coloured without a second treatment. **Colour is never the
only signal** — every status pairs with a word or an icon (`10-ACCESSIBILITY.md`).

For destructive _buttons_, use a `#DC2626` fill with white text rather than `#F87171`, which is a text colour and
too light to sit behind white.

## Tokens in code

Tailwind v4 is CSS-first; shadcn reads the same variables. One file:

```css
/* dashboard/src/index.css */
@import "tailwindcss";

@theme {
	--color-background: #0a0a0f;
	--color-foreground: #ffffff;
	--color-muted: #1a1a25;
	--color-muted-foreground: #a1a1b5;
	--color-card: #12121a;
	--color-popover: #1a1a25;
	--color-border: #26263a;
	--color-input: #6b6b8f;
	--color-primary: #7c3aed;
	--color-primary-foreground: #ffffff;
	--color-accent: #a78bfa;
	--color-ring: #a78bfa;
	--color-success: #34d399;
	--color-warning: #fbbf24;
	--color-destructive: #dc2626;

	--radius: 0.625rem;
	--font-sans: "Inter var", ui-sans-serif, system-ui, sans-serif;
	--font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

**Never write a hex value in a component.** `bg-card`, `text-muted-foreground`, `border-input`. That is what makes
a light theme a later possibility rather than a rewrite, and what makes an accessibility fix one line.

Ship fonts self-hosted (`@fontsource/inter`) rather than from Google Fonts: no third-party request, no CSP
exception, no GDPR question for self-hosters, and it works offline. Falls back to the system stack if you skip
it.

## Typography

| Role       | Size / weight        | Colour             |
| ---------- | -------------------- | ------------------ |
| Page title | 24px / 600           | `foreground`       |
| Section    | 18px / 600           | `foreground`       |
| Body       | 14px / 400           | `foreground`       |
| Label      | 13px / 500           | `muted-foreground` |
| Help text  | 12px / 400           | `muted-foreground` |
| Numeric    | tabular-nums, `mono` | `foreground`       |

14px body, not 16px — this is a dense settings tool, not an article. Never below 12px. `tabular-nums` on every
number in a table so columns of figures line up and do not jitter as they update.

## Layout

- Sidebar 240px, fixed, collapsing to icons below 1280px and to a sheet below 768px.
- Content max-width 1100px, centred. A settings form spanning a 4K monitor is unreadable.
- 8px spacing scale. Sections `gap-6`, list rows `py-3`.

### Two columns, and only two

The whole layout resolves to two left edges, and it is worth keeping it that way:

- **The page column** — page title, section headings, the first tab's label. Everything at the top level of a
  screen starts here.
- **The card column** — 24px inside a card, wherever content sits inside one.

That is why `Card` has a fixed padding scale (`none` / `compact` / `default`) rather than a class per call site,
and why **all three share the same 24px inline padding**: only the vertical rhythm changes with density, so a
dense tile and a roomy panel still start their text on the same line. A card that sets its own `p-4` puts its
content 8px left of every other card on the page. There is a test pinning this.

Vertical rhythm comes from one `gap-6` on the content column, not from a margin on each child. Margins drift as
sections are added and removed; a single gap cannot.

The sidebar follows the same discipline: every row shares one class, so the icons sit on one axis and the labels
on another. They were four pixels apart before it was measured.

- Radius 10px on cards and buttons, 8px on inputs. Consistent, and softer than shadcn's default 6px, which suits
  the darker palette.
- **No drop shadows.** On near-black they read as smudges. Elevation is surface colour and a 1px border.

## Components to pull from shadcn

`button` `card` `dialog` `alert-dialog` `dropdown-menu` `input` `label` `select` `switch` `tabs` `table`
`badge` `skeleton` `sonner` `tooltip` `separator` `sheet` `avatar` `command` `form` `scroll-area` `popover`

`alert-dialog` specifically for destructive confirmations — it traps focus and requires a deliberate choice,
where `dialog` can be dismissed by pressing Escape.

Then a small set of your own in `components/common/`:

| Component           | Why it is not a shadcn primitive                                             |
| ------------------- | ---------------------------------------------------------------------------- |
| `RolePicker`        | Needs role colour, position, and "the bot cannot assign this" disabled state |
| `ChannelPicker`     | Needs the `canSend` flag from the API and a `#` prefix                       |
| `SavingIndicator`   | Idle → Saving → Saved, with an `aria-live` region                            |
| `ConfirmDialog`     | Typed-name confirmation for anything irreversible                            |
| `StatTile`          | Label, big number, optional delta — used across overview and owner console   |
| `EmptyState`        | Icon, sentence, and the one action that fixes it                             |
| `PermissionWarning` | "Testify cannot post in #general" with a fix link                            |

## Motion

- 150ms for hover and colour, 200ms for anything that moves, `ease-out`.
- Dialogs fade and scale from 0.97. Nothing slides in from off-screen.
- Skeletons pulse; spinners only for actions over 400ms.
- **Wrap all of it in `prefers-reduced-motion`.** One block in `index.css` reducing every duration to 0.01ms.

Motion here is feedback, not decoration. A row highlighting for 400ms after it saves tells you the save landed;
a page transition tells you nothing and costs 200ms.

### The one deliberate exception

The WebGL backdrop is decoration, and it is allowed on terms that keep the rule above intact: it never delays
an interaction, it is on its own lazily-fetched chunk so it costs nothing until it is drawn, and
`prefers-reduced-motion` skips it entirely rather than merely slowing it. It sits behind the content at
`opacity: 0.22`, dimmer than on the sign-in screen, because behind a settings form it is a texture rather than
the subject.

Two constraints on it that are not negotiable: it is `aria-hidden` and `pointer-events-none`, so it carries no
information and can never take a click; and the surfaces above it stay **opaque**, so the contrast ratios in
this document still hold. A translucent card over a moving field is where a dark theme quietly loses AA.

The entrance animations obey the same test. `Reveal` staggers a list by 40ms per item and caps the total at
240ms — long enough to read as arriving in order, short enough that the last card is not visibly late.

## Brand

Use Testify's existing identity rather than inventing a second one: `src/config/theme.ts` already holds the
colours and emoji the embeds use, and the sidebar should carry the bot's own avatar from
`client.user.displayAvatarURL()` so a self-hoster's fork looks like _their_ bot without editing any CSS.

Guild icons come from Discord's CDN, already allowed by the CSP in `03-AUTH.md`. Always render a fallback — a
guild with no icon is common, and a broken image in the picker is the first thing anyone sees. The fallback is a
lettered tile whose colour is derived from the server's id, so the picker is scannable by shape rather than by
reading every name, and a server keeps its colour between visits.

## Iconography

Icons come from `lucide-react`, at 14–18px beside text and 26–28px in an empty state. Two rules:

- **An icon beside a label is `aria-hidden`.** It repeats the text; announcing it twice is noise.
- **An icon without a label needs an accessible name**, and a tooltip is not one — see the tooltip rule below.

Every bot feature has a fixed icon and tint in `dashboard/src/config/features.ts`, so levelling is the same
purple everywhere it appears and a reader learns the mapping once. Unknown keys get a neutral fallback rather
than a gap.

## Tooltips

A tooltip **describes**; it never names. `aria-describedby`, never `aria-labelledby`, and every tooltip opens on
keyboard focus as well as hover — one that only a pointer can reach is one most people never see.

The place this matters most is the icon-only sidebar, and the tooltip is the _second_ half of that fix. The
first is that the labels there are `sr-only`, not `hidden`: `display: none` takes them out of the accessibility
tree, and a nav link named nothing is worse than an unlabelled icon.
