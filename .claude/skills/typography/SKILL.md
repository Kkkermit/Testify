---
name: ui-typography
description: >
  Professional typography rules for UI design, web applications, software interfaces, and all screen-based
  text. Enforces timeless typographic correctness that LLMs consistently get wrong: proper quote marks,
  dashes, spacing, hierarchy, and layout. ENFORCEMENT MODE: When generating ANY HTML, CSS, React, JSX,
  or UI code containing visible text, auto-apply every rule in this skill silently — do not ask, do not
  explain, just produce correct typography. AUDIT MODE: When reviewing or improving existing interfaces or
  legacy code, flag violations and provide fixes. Trigger on: any HTML/CSS/React artifact creation, "build
  a landing page", "create a component", "design a UI", "fix the typography", "make this look professional",
  "review this layout", web design, presentation design, dashboard creation, document generation, or any
  task producing visible text for humans. Even if the user doesn't mention typography, apply these rules
  whenever generating UI output.
---

# UI Typography Skill

## Attribution

These rules are distilled from **Matthew Butterick's *Practical Typography*** (https://practicaltypography.com).
Butterick is a typographer, writer, and type designer whose work bridges professional typography and everyday
digital writing. Thank you, Matthew, for making this knowledge accessible and encyclopedic. If you find this
skill valuable, consider supporting his work directly.

## Mode of Operation

These are **permanent rules** — not trends, not opinions. They come from centuries of typographic practice,
validated by how the human eye reads. They do not go out of style.

**ENFORCEMENT (default):** When generating ANY UI with visible text, apply every rule automatically. Use
correct HTML entities, proper CSS. Do not ask permission. Do not explain. Just produce correct typography.

**AUDIT:** When reviewing existing code or design, identify violations and provide before/after fixes.

**Reference files** (read when generating CSS or looking up entities):
- `references/css-templates.md` — Full CSS baseline template, responsive patterns, OpenType features
- `references/html-entities.md` — Complete entity table with all characters and codes

---

## Characters

### Quotes and Apostrophes — Always Curly

Straight quotes are typewriter artifacts. Use `&ldquo;` `&rdquo;` for double, `&lsquo;` `&rsquo;` for single.

Apostrophes always point down — identical to closing single quote `&rsquo;`. Smart-quote engines wrongly
insert opening quotes before decade abbreviations ('70s) and word-initial contractions ('n'). Fix with
explicit `&rsquo;`.

The `<q>` tag auto-applies curly quotes when `<html lang="en">` is set.

Hawaiian okina points upward — it's a letter, not an apostrophe. Use opening single quote or anglicize.

### JSX/React Implementation Warning

**Unicode escape sequences (`\u2019`, `\u201C`, etc.) do NOT work in JSX text content.** They render
as literal characters — the user sees `\u2019` instead of a curly apostrophe. This is because JSX text
between tags is treated as string literals by the transpiler, not as JavaScript expressions.

**What fails:**
```jsx
{/* WRONG — renders literally as \u2019 */}
<p>Don\u2019t do this</p>
```

**What works (pick one):**

1. **Actual UTF-8 characters (preferred):** Paste the real character directly into the source file.
   ```jsx
   <p>Don\u2019t do this</p>  {/* This is the actual curly apostrophe character U+2019 */}
   ```

2. **JSX expression with string literal:** Wrap in curly braces so the JS engine interprets the escape.
   ```jsx
   <p>Don{'\u2019'}t do this</p>
   ```

3. **HTML entity (HTML files only):** Use `&rsquo;` — but this does NOT work in JSX/React.

**For bulk fixes via CLI**, use `sed` with raw UTF-8 bytes (not escape sequences):
```bash
CURLY=$(printf '\xe2\x80\x99')  # U+2019 RIGHT SINGLE QUOTATION MARK
sed -i '' "s/don't/don${CURLY}t/g" file.tsx
```

**In JavaScript data arrays and string literals**, `\u2019` works correctly because the JS engine
processes the escape. The bug only affects JSX text content between tags.

### Dashes and Hyphens — Three Distinct Characters

| Character | HTML | Use |
|-----------|------|-----|
| - (hyphen) | `-` | Compound words (cost-effective), line breaks |
| – (en dash) | `&ndash;` | Ranges (1–10), connections (Sarbanes–Oxley Act) |
| — (em dash) | `&mdash;` | Sentence breaks—like this |

Never approximate with `--` or `---`. If you open with "from", pair with "to" not en dash. Hyphen for
compound names (marriage); en dash for joint authorship. Em dash typically flush; add `&thinsp;` if crushed.
No slash where en dash belongs. Hyphenate phrasal adjectives (five-dollar bills). No hyphen after -ly adverbs.

### Ellipses — One Character

Use `&hellip;` (…), not three periods. Spaces before and after; use `&nbsp;` on the text-adjacent side.
For interrupted dialogue, prefer em dash over ellipsis.

### Math and Measurement

Use `&times;` for multiplication, `&minus;` for subtraction. Use `+` and `=` from keyboard.
En dash is acceptable as simple minus. Dimensions: 8.5″ × 14″ uses `&times;`.

**Foot and inch marks** — the ONE exception to curly quotes. Must be STRAIGHT: `&#39;` for foot,
`&quot;` for inch. Use `&nbsp;` between values: `6&#39;&nbsp;10&quot;`.

### Trademark and Copyright

Use real symbols: `&copy;` `&trade;` `&reg;`, never (c) (TM) (R). ™/® are superscripts, no space before.
© is inline, followed by `&nbsp;` then year. "Copyright ©" is redundant — word OR symbol, not both.

### Paragraph and Section Marks

`&sect;` (§) and `&para;` (¶) always followed by `&nbsp;`: `&sect;&nbsp;1782`. Spell out at sentence start.
Double for plurals: `&sect;&sect;`.

### Accented Characters

Proper names: accents are MANDATORY (François Truffaut, Plácido Domingo). Loanwords: check dictionary —
some naturalized (naive), some not (cause célèbre).

### Other Punctuation

- **Semicolons** join independent clauses. **Colons** introduce completion. Don't mix them
- **Question marks**: underused — simplify topic sentences with them
- **Exclamation points**: overused — budget ONE per long document. Never multiple in a row
- **Ampersands**: correct in proper names only. Write "and" in body text
- **Parentheses/brackets**: do NOT adopt formatting of surrounded material
- **Emoticons/emoji**: OK in email/Slack. Never in formal documents or professional UI copy

---

## Spacing

### One Space After Punctuation — Always

Exactly one space after any punctuation. Never two. Not debatable. Two spaces create rivers and
disrupt text balance. The period already contains visual white space.

### Nonbreaking Spaces

`&nbsp;` prevents line break. Use before numeric refs (`&sect;&nbsp;42`, `Fig.&nbsp;3`), after ©
(`&copy;&nbsp;2025`), after honorifics (`Dr.&nbsp;Smith`), between foot/inch values.

### White-Space Characters

| Need | Tool |
|------|------|
| Space between words | One word space (spacebar) |
| Prevent line break | `&nbsp;` |
| New line, same paragraph | `<br>` |
| New paragraph | `<p>` tags |
| New page (print) | `page-break-before: always` |
| Suggest hyphenation point | `&shy;` |

Never hold spacebar. Never double carriage returns for spacing. Never tabs for indentation in output.
HTML collapses all whitespace to single space (except `&nbsp;`).

---

## Text Formatting

### Bold and Italic

**Rule 1**: Bold OR italic. Mutually exclusive. Never combine.
**Rule 2**: Use as little as possible. If everything is emphasized, nothing is.

Serif: italic for gentle, bold for strong. Sans serif: bold only — italic sans barely stands out.
Never bold entire paragraphs. Never use quotation marks for emphasis.

### Underlining — Never

Never underline in a document or UI. Typewriter workaround. Use bold or italic. For web links,
use subtle styling: `text-decoration-thickness: 1px; text-underline-offset: 2px`.

### All Caps — Less Than One Line, Always Letterspaced

Caps are harder to read (homogeneous rectangles vs varied lowercase contour). Suitable for short
headings, labels, captions. **ALWAYS** add 5–12% letterspacing. **ALWAYS** ensure kerning is on.
**NEVER** capitalize whole paragraphs. `letter-spacing: 0.06em` in CSS.

### Small Caps — Real Only

Never fake (scaled-down regular caps). Use `font-variant-caps: small-caps` with fonts that have
real small caps (OpenType `smcp`). System fonts lack them. Add letterspacing + kerning.

### Point Size

Print: 10–12pt. Web: 15–25px. The 12pt default is a typewriter relic. Half-point differences
matter. Use smallest increment for emphasis. Use `clamp()` for fluid web sizing.

### Letterspacing

5–12% extra on ALL CAPS and small caps. Nothing on lowercase. Never spread so far apart that
letters could fit in the gaps. CSS: `letter-spacing: 0.05em` to `0.12em`.

### Kerning — Always On

No exceptions. `font-feature-settings: "kern" 1; text-rendering: optimizeLegibility;`

### Ligatures

Mandatory only when fi/fl visually collide. Check bold and italic too. Otherwise optional.
CSS: `font-feature-settings: "liga" 1`.

### Alternate Figures

Tabular (`"tnum"`) for data tables. Oldstyle (`"onum"`) for body text. Default figures are fine
for most uses. `font-variant-numeric: tabular-nums lining-nums` for numeric tables.

### Font Selection

1. No goofy fonts (novelty, script, handwriting, circus) in professional work
2. No monospaced for body text — code only (and Courier is the worst monospaced)
3. Print body: strongly prefer serif
4. Web body: serif or sans both fine on modern screens
5. Metrics spacing in InDesign, never optical (optical mangles kerning)

### Mixing Fonts

Max 2 fonts. Each gets a consistent role. Can mix serif+serif or sans+sans. Rarely mix within
a paragraph. Lower contrast often more effective than high contrast.

---

## Page Layout

### Body Text First

Set body text BEFORE anything else. Four decisions determine everything: font, point size,
line spacing, line length. All other elements calibrate against these.

### Line Length — 45–90 Characters

The #1 readability factor designers get wrong. The #1 flaw in responsive web layouts.
Measure in characters, not inches. Alphabet test: fit 2–3 lowercase alphabets per line.
CSS: `max-width: 65ch` on text containers.

### Line Spacing — 120–145% of Point Size

`line-height: 1.2` to `1.45`. Single-spaced (~117%) is too tight. Double (~233%) is too loose.
Word processor "Single" and "Double" both miss the optimal range.

### Page Margins

One inch is not enough for proportional fonts. Print: 1.5–2.0″ at 12pt. Web: `max-width` on
text containers plus `padding`. Don't fear white space — generous margins look professional.

### Text Alignment

Left-align for web (default). Justified requires `hyphens: auto` — browser engines are crude.
Centered: sparingly, only for short titles (< 1 line). Never center whole text blocks.

### Paragraph Separation — Indent OR Space, Never Both

**First-line indent**: 1–4× point size. `text-indent: 1.5em`. Optional on first paragraph.
**Space between**: 50–100% of font size. `margin-bottom: 0.75em`. Never double `<br>` tags.

### Headings — Max 3 Levels

1. Don't all-caps headings (unless very short + letterspaced)
2. Don't underline headings
3. Don't center headings (rare exceptions)
4. Emphasize with **space above and below** — subtle and effective
5. Use **bold, not italic** — stands out better
6. Smallest point-size increment needed (body 11pt → heading 13pt, not 18pt)
7. `hyphens: none` on headings
8. Space above > space below (heading relates to text that follows)
9. Keep heading with next paragraph (`page-break-after: avoid`)
10. Tiered numbers (1.1, 2.1) over roman numerals (I.A.1.a.i)

### Block Quotations

Reduce size + line spacing slightly. Indent 2–5em. No quotation marks (indent signals the quote).
Keep line length readable. Use sparingly — long block quotes signal lazy writing.

### Lists

Semantic markup (`<ul>`, `<ol>`), never manual bullets. Prefer hollow bullets. Asterisks are too
small for bullets. Don't over-indent.

### Tables — Remove Borders, Add Padding

Data creates an implied grid. Borders add clutter. Keep only thin rule under header row.
`padding: 0.5em 1em`. Tabular figures for numeric columns. Right-align numbers.

### Rules and Borders

Try space above and below first. Border thickness: 0.5–1pt. No patterned borders. Thick lines
are chartjunk.

### Flow Control

Widows (last line alone at top of page) and orphans (first line alone at bottom). CSS print:
`orphans: 2; widows: 2`. Headings: `page-break-after: avoid`. Soft hyphens `&shy;` for
words that confuse hyphenation engines.

### Columns and Grids

Print columns: 2–3 on letter paper, never 4. Web columns: awkward (indefinite bottom edge).
Grids guide, not guarantee — simpler grids enforce more consistency. Aligning ugly to a grid
still produces ugly.

---

## Responsive Web Typography

**The rules don't change with screen size.** Same line length, line spacing, hierarchy.

1. Scale `font-size` and container `width` together
2. Always `max-width` on text containers — never edge-to-edge text
3. Don't use `ch` unit for exact measurement (only measures zero width)
4. `clamp()` for fluid scaling: `font-size: clamp(16px, 2.5vw, 20px)`
5. Mobile minimum: `padding: 0 1rem` on text containers
6. The common failure: images/nav scale carefully, body text ignored

---

## Screen Considerations

Modern screens render type nearly as well as print. "Sans serif for screens" was true for 72dpi
and is now obsolete. Serif fonts work fine on modern screens. Dark mode: reduce weight slightly.
Test on macOS and Windows (antialiasing differs).

---

## Maxims of Page Layout

1. **Body text first** — its 4 properties determine everything
2. **Foreground vs background** — don't let chrome upstage body text
3. **Smallest visible increments** — half-points matter
4. **When in doubt, try both** — make samples, don't theorize
5. **Consistency** — same things look the same
6. **Relate new to existing** — each element constrains the next
7. **Keep it simple** — 3 colors and 5 fonts? Think again
8. **Imitate what you like** — emulate good typography from the wild
