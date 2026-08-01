# 10. Accessibility

**Target: WCAG 2.2 Level AA.** Not a stretch goal — a settings dashboard is mostly forms, tables and dialogs,
which is exactly the content the guidelines were written for. Failing here takes deliberate effort.

## What Radix gives you, and what it does not

shadcn components wrap Radix primitives, which handle the parts that are genuinely hard: focus trapping in
dialogs, roving tabindex in tab lists, `aria-expanded` on triggers, Escape to dismiss, returning focus to the
element that opened a menu, and typeahead in selects.

What Radix cannot do for you, and what therefore needs attention on every screen:

- Whether a form control has a **label** at all.
- Whether an icon-only button has an **accessible name**.
- Whether colour is the **only** thing distinguishing a state.
- Whether the **heading structure** makes sense read alone.
- Whether an **error message** is associated with the field it belongs to.
- Whether a change made by JavaScript is **announced**.

That is the checklist below. Using shadcn is a head start, not a pass.

## Contrast

Done in `08-DESIGN.md`, with the numbers worked out. The summary:

- Body text `#FFFFFF` at 19.8:1 and `#A1A1B5` at 7.79:1 — both comfortably AA.
- Purple as text is `#A78BFA` at 7.26:1. The obvious `#8B5CF6` is 4.66:1 and **fails** for body text; it is used
  as a fill only.
- White on the `#7C3AED` button is 5.70:1.
- **Interactive borders are `#6B6B8F` at 3.88:1**, satisfying 1.4.11 for non-text contrast. The decorative
  `#26263A` at 1.34:1 is for dividers only, never for an input outline.

## Keyboard

Everything, with no mouse. This is the single test that catches the most.

- **Skip link** as the first focusable element: "Skip to main content" → `#main`, visible on focus.
- **Focus is always visible.** `:focus-visible` ring, 2px `--color-ring` (`#A78BFA`, 7.26:1) with a 2px offset so
  it reads against any surface. Never `outline: none` without a replacement.
- **Tab order follows the visual order.** No positive `tabIndex`.
- **No keyboard traps** — the one real risk is a dialog, and Radix handles it.
- **Escape closes** every dialog, sheet, popover and menu.
- **Enter submits** every form. A form whose only submit path is clicking a button is broken for keyboard users.
- **Destructive confirmations do not autofocus the destructive button.** Focus the cancel, or the text input if
  the name must be typed.

Manual pass, per screen, before a phase is called done:

1. `Tab` from the top: can you reach every control?
2. Is the focused element always visible, and never hidden under a sticky header?
3. Can you operate every control with `Enter`/`Space`/arrows?
4. Open a dialog: does focus move in, stay in, and come back to the trigger on close?
5. Are the tab lists navigable with arrow keys?

## Screen readers

- **Landmarks.** One `<header>`, one `<nav>`, one `<main id="main">`, one `<footer>`. Sidebar nav gets
  `aria-label="Sections"` so it is distinguishable from the guild switcher.
- **One `<h1>` per page**, then `<h2>` per section, no skipped levels. Card titles are headings, not styled divs.
- **Every input has a `<label>`**, associated by `htmlFor`. A placeholder is not a label — it disappears on
  typing.
- **Errors** get `aria-invalid` on the field and `aria-describedby` pointing at the message. shadcn's `form`
  wires this if you use `FormField`/`FormMessage` rather than hand-rolling.
- **Icon-only buttons** carry `aria-label`. The row of icon actions in a table is where this is always missed.
- **Live regions**: toasts in `aria-live="polite"`; the `SavingIndicator` in a polite region so "Saved" is
  announced; a destructive result in `aria-live="assertive"`.
- **Tables are tables.** `<table>` with `<th scope="col">`, a `<caption>` (visually hidden is fine), and no
  layout-only tables. Sortable headers use `aria-sort`.
- **`document.title` updates on navigation** — `"Levelling · My Server · Testify"`. An SPA that never changes its
  title makes browser history and tab-switching useless for everyone, and navigation unintelligible for a screen
  reader user.
- **Route changes are announced.** A visually hidden `aria-live="polite"` region that receives the new page title
  on navigation; without it, a screen reader user gets no signal that anything changed.

## Colour is never the only signal

The rule that a purple-and-green dark theme most wants to break.

| Instead of                    | Do                                                        |
| ----------------------------- | --------------------------------------------------------- |
| A green dot for "enabled"     | A green dot **and** the word "Enabled"                    |
| A red row for a failed action | An icon, the word "Failed", and the colour                |
| A purple row for "selected"   | Purple tint **and** `aria-selected` **and** a left border |
| Role colour alone in a picker | The colour swatch **and** the role name                   |

Discord role colours are user-chosen and frequently unreadable — a role coloured `#1a1a1a` on a near-black
background is invisible. Render the swatch as a bordered circle beside the name in `foreground`, never as the
text colour.

## Forms

- Labels above inputs, help text below, errors below that.
- Validate on blur and on submit, not on every keystroke — announcing an error while someone is mid-word is
  hostile.
- Errors say what to do: "Level must be between 1 and 500", not "Invalid".
- Server validation issues map onto fields by path (`05-API.md`), so the message lands on the right input rather
  than in a generic banner.
- Required fields marked in text, not with a red asterisk alone.
- Number inputs get `inputMode="numeric"`.
- Autosaving fields announce their result; if a save fails the field keeps the attempted value so nothing is
  retyped.

## Motion and other preferences

```css
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
	}
}
```

Also honour `prefers-contrast: more` by swapping `--color-border` for `--color-input` and muted text for
`foreground`. Two lines, and it makes the theme usable for people who currently cannot use dark UIs at all.

## Zoom and reflow

- Usable at **200% zoom** with no horizontal scrolling (WCAG 1.4.10), which means no fixed pixel widths on
  containers and no `overflow: hidden` hiding content.
- Wide tables scroll **inside their own container**, never the page body.
- **Text spacing** (1.4.12): survives increased line-height and letter-spacing — avoid fixed-height rows with
  text in them.
- Touch targets **44×44px** minimum (2.5.8), which mostly means the icon buttons in table rows need padding.

## WCAG 2.2 additions worth naming

The newer criteria are easy to satisfy if you know them, and easy to fail if you do not:

- **2.4.11 Focus Not Obscured** — a sticky header must not cover the focused element. Add `scroll-margin-top`
  equal to the header height on focusable elements.
- **2.5.7 Dragging Movements** — if any list ever becomes drag-to-reorder, it needs move-up/move-down buttons too.
- **3.3.7 Redundant Entry** — do not ask for the same value twice in one flow.
- **3.3.8 Accessible Authentication** — the sign-in is a single OAuth button with no puzzle or memory test, so
  this passes by construction.

## How it is checked

**Automated, in CI** — catches perhaps 40% of issues, so it is a floor:

```ts
it("has no accessibility violations", async () => {
	const { container } = renderWithProviders(<LevellingPage />);
	expect(await axe(container)).toHaveNoViolations();
});
```

`jest-axe` on every page-level test. Add `eslint-plugin-jsx-a11y` to the dashboard's ESLint block, which catches
missing labels and bad ARIA at authoring time.

**Manual, per phase** — the other 60%:

1. The keyboard pass above, every screen.
2. One screen-reader pass per phase — VoiceOver or NVDA — on the levelling page and one dialog.
3. Zoom to 200% and to 400%.
4. Check with the OS in reduced-motion mode.
5. Grey-scale the page and confirm every state is still distinguishable.

## What is wired up

- **`jest-axe` on every page-level test** — seven suites, each rendering the real screen and asserting no
  violations. Colour contrast is disabled in that config because jsdom computes no styles, so the rule there can
  only report false negatives; the ratios are worked out above and checked against the rendered page instead.
  The check is proven able to fail: removing a `<label>` turns it red.
- **A route announcer.** `app/RouteAnnouncer.tsx` is a polite live region that reads the new `document.title`
  after a navigation, so a screen reader is told the page changed.
- **Titles carry the server** — `"Levelling · Testify HQ · Testify"` — so two tabs on the same screen in
  different servers are told apart.
- **Role colours are swatches, never text.** `RoleSwatch` puts the colour on a bordered dot beside a
  full-contrast name, which is the rule below that a purple theme most wants to break.
- **`prefers-contrast: more`** swaps the divider colour for the interactive one and muted text for white.
- **`scroll-margin-top` on `:focus-visible`** (2.4.11), because the header on a phone is sticky.
- **Buttons are at least 44px tall** (2.5.8), and number inputs carry `inputMode="numeric"`.

`eslint-plugin-jsx-a11y` is **not** installed: its latest release (6.10.2) declares a peer of ESLint ≤9 and this
repo is on ESLint 10, so adding it needs `--force` and breaks `npm ci`. Revisit when it supports ESLint 10;
`jest-axe` covers the render-time half in the meantime.

Still outstanding: the manual passes — screen reader, 200% and 400% zoom, greyscale — which no tool replaces.

**Do not ship a "a11y: TODO" phase.** It is far cheaper as you go, and a dashboard people can actually operate is
part of what "open source friendly" means — contributors and users are not all sighted mouse users.
