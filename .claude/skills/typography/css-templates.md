# CSS Typography Templates

Read this file when generating CSS for any web project, building a design system, or auditing
existing stylesheets. These templates encode every layout and formatting rule from the skill.

---

## Complete Baseline Template

Copy-paste starting point. Every property maps to a specific typographic rule.

```css
/* =============================================
   TYPOGRAPHY BASELINE
   Rules from Practical Typography (Butterick)
   ============================================= */

*, *::before, *::after { box-sizing: border-box; }

html {
  font-size: clamp(16px, 2.5vw, 20px);       /* 15–25px range, fluid */
  -webkit-text-size-adjust: 100%;              /* prevent iOS resize */
}

body {
  font-family: /* your-font, */ Georgia, 'Times New Roman', serif;
  line-height: 1.38;                           /* 120–145% sweet spot */
  color: #1a1a1a;
  background: #fefefe;
  text-rendering: optimizeLegibility;          /* enables kern + liga */
  font-feature-settings: "kern" 1, "liga" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---- TEXT CONTAINER: LINE LENGTH CONTROL ---- */

main, article, .prose {
  max-width: min(65ch, 90vw);                  /* 45–90 chars enforced */
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}

/* ---- PARAGRAPHS ---- */
/* Choose ONE: space-between OR first-line-indent. Never both. */

/* Option A: Space between (default for web) */
p { margin: 0 0 0.75em 0; }                   /* 50–100% of font size */

/* Option B: First-line indent (uncomment to use instead)
p { margin: 0; }
p + p { text-indent: 1.5em; }
*/

/* ---- HEADINGS: SUBTLE, SPACED, BOLD ---- */

h1, h2, h3, h4 {
  line-height: 1.15;                           /* tighter than body */
  hyphens: none;                               /* never hyphenate headings */
  page-break-after: avoid;                     /* keep with next paragraph */
  font-weight: 700;                            /* bold, not italic */
}
h1 {
  font-size: 1.5em;                            /* smallest increment needed */
  margin: 2.5em 0 0.5em;                       /* space above > below */
}
h2 {
  font-size: 1.25em;
  margin: 2em 0 0.4em;
}
h3 {
  font-size: 1.1em;
  margin: 1.5em 0 0.3em;
}

/* ---- EMPHASIS ---- */

em { font-style: italic; }                     /* gentle emphasis (serif) */
strong { font-weight: 700; }                   /* strong emphasis */
/* NEVER: strong em, em strong, or u for emphasis */

/* ---- ALL CAPS: ALWAYS LETTERSPACED ---- */

.caps {
  text-transform: uppercase;
  letter-spacing: 0.06em;                      /* 5–12% range */
  font-feature-settings: "kern" 1;
}

/* ---- SMALL CAPS: REAL ONLY ---- */

.small-caps {
  font-variant-caps: small-caps;               /* requires font with smcp */
  letter-spacing: 0.05em;
  font-feature-settings: "smcp" 1, "kern" 1;
}

/* ---- BLOCK QUOTES ---- */

blockquote {
  margin: 1.5em 2em;                           /* indent 2–5em */
  font-size: 0.92em;                           /* slightly smaller */
  line-height: 1.3;
}

/* ---- TABLES: CLEAN, NOT CLUTTERED ---- */

table {
  border-collapse: collapse;
  width: 100%;
}
th, td {
  padding: 0.5em 1em;                          /* generous cell padding */
  text-align: left;
  vertical-align: top;
  border: none;                                /* remove cell borders */
}
thead th {
  border-bottom: 1.5px solid currentColor;     /* thin rule under header */
  font-weight: 600;
}

/* Numeric data tables: tabular lining figures */
.data-table td {
  font-feature-settings: "tnum" 1, "lnum" 1;
  font-variant-numeric: tabular-nums lining-nums;
}

/* ---- LISTS ---- */

ul, ol {
  padding-left: 1.5em;
  margin: 0 0 1em;
}
li { margin-bottom: 0.3em; }

/* ---- HORIZONTAL RULES ---- */

hr {
  border: none;
  border-top: 1px solid currentColor;          /* 0.5–1pt, no patterns */
  opacity: 0.3;
  margin: 2em 0;
}

/* ---- LINKS ---- */

a {
  color: inherit;
  text-decoration-line: underline;
  text-decoration-thickness: 1px;              /* subtle, not heavy */
  text-underline-offset: 2px;
}
a:hover { opacity: 0.8; }

/* ---- CODE ---- */

code {
  font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.88em;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  background: rgba(0,0,0,0.04);
}
pre code {
  display: block;
  padding: 1em;
  overflow-x: auto;
  line-height: 1.5;
}

/* ---- RESPONSIVE ---- */

@media (max-width: 600px) {
  blockquote { margin: 1em 1em; }
  table { font-size: 0.9em; }
  th, td { padding: 0.4em 0.6em; }
}

/* ---- PRINT ---- */

@media print {
  body { font-size: 11pt; line-height: 1.3; }
  main { max-width: none; }
  h1, h2, h3 { page-break-after: avoid; }
  p { orphans: 2; widows: 2; }
}
```

---

## Responsive Typography Patterns

### Fluid Typography with Clamp

```css
body {
  font-size: clamp(16px, 2.5vw, 20px);
}
main {
  max-width: min(65ch, 90vw);
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}
h1 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
h2 { font-size: clamp(1.25rem, 3vw, 1.75rem); }
```

### Breakpoint-Based Alternative

```css
body { font-size: 16px; }
@media (min-width: 600px)  { body { font-size: 17px; } }
@media (min-width: 900px)  { body { font-size: 18px; } }
@media (min-width: 1200px) { body { font-size: 19px; } }
```

### Key Principles

1. Scale `font-size` and container `width` together
2. Always `max-width` on text containers — never edge-to-edge
3. Don't use `ch` unit for exact line length (only measures zero width)
4. Use `vw` units with `clamp()` for bounds
5. Mobile minimum: `padding: 0 1rem` on text containers

---

## OpenType Features Reference

```css
/* Body text */
.body {
  font-feature-settings:
    "kern" 1,       /* kerning pairs — always on */
    "liga" 1,       /* standard ligatures */
    "calt" 1;       /* contextual alternates */
}

/* Body text with oldstyle figures */
.prose {
  font-feature-settings:
    "kern" 1, "liga" 1, "calt" 1,
    "onum" 1;       /* oldstyle (lowercase-height) numbers */
}

/* Data tables */
.data-table td {
  font-feature-settings:
    "kern" 1,
    "tnum" 1,       /* tabular (fixed-width) numbers */
    "lnum" 1;       /* lining (capital-height) numbers */
}

/* Small caps */
.small-caps {
  font-feature-settings:
    "kern" 1,
    "smcp" 1;       /* real small caps */
  letter-spacing: 0.05em;
}

/* All caps with capital spacing */
.all-caps {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-feature-settings:
    "kern" 1,
    "cpsp" 1;       /* capital spacing (if font supports) */
}
```

---

## Dark Mode Considerations

```css
@media (prefers-color-scheme: dark) {
  body {
    color: #e0e0e0;
    background: #1a1a1a;
    font-weight: 350;           /* slightly lighter — dark bg makes text appear heavier */
    -webkit-font-smoothing: auto; /* let system decide in dark mode */
  }
}
```

---

## React/JSX Inline Pattern

When generating React components with text, apply entities directly:

```jsx
// WRONG
<h2>IMPORTANT NOTICE</h2>
<p>"Hello," she said. "It's a beautiful day..."</p>
<p>Price: $12 x 4 = $48</p>
<p>Pages 1-10</p>

// RIGHT
<h2 style={{ letterSpacing: '0.05em' }}>IMPORTANT NOTICE</h2>
<p>&ldquo;Hello,&rdquo; she said. &ldquo;It&rsquo;s a beautiful day&hellip;&rdquo;</p>
<p>Price: $12 &times; 4 = $48</p>
<p>Pages 1&ndash;10</p>
```
