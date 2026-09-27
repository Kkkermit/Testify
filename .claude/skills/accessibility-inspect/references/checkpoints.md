# Inspect checkpoints — per-check procedure and default grades

The detailed procedure behind the ledger table in [`../SKILL.md`](../SKILL.md). Read this when a triggered area needs its steps, or for a `--deep` pass. Each checkpoint's icon is its default evidence grade: lower it freely, raise it only with proof. The evidence budget still applies — a ◐ check gets one selector, one screenshot, a handoff note, and stops.

**Keyboard and focus** — 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11
- ● Every interactive element is reachable with `Tab` and operable with `Enter`/`Space`/arrows. The batched walk establishes reachability and order; confirm operability with `press_key` only at composite widgets and the walk's suspects.
- ● No keyboard trap: focus that can't leave with `Tab`/`Esc` is a trap. A ● trap claim needs the real key presses at that widget.
- ◐ Focus order follows reading and visual order. The walk captures the order; a person confirms whether it's coherent.
- ◐ Focus indicator is visible. The walk returns computed `outline`/`box-shadow` per stop; screenshot only the stops that look questionable.
- ◐ Focus is not hidden by sticky or overlay elements (2.4.11). The walk flags stops under overlay rects; screenshot the flagged ones.

**Structure and semantics** — 1.3.1, 1.3.2, 2.4.1, 2.4.6
- ● Landmarks are present (banner/nav/main/contentinfo), with exactly one `main`.
- ● Heading outline skips no levels and has one h1. Derive it from the initial snapshot.
- ● Lists and tables use semantic markup; data tables associate headers.
- ◐ Headings and labels are descriptive, and DOM reading order matches meaning. A person confirms.

**Names, roles, states** — 4.1.2, 2.5.3, 4.1.3
- ● Every control has an accessible name, and the visible label is part of that name (2.5.3). Name presence alone is engine-owned; inspect owns label-in-name and anything the engine's list didn't cover.
- ● Custom-widget roles match their APG pattern.
- ◐ States (expanded/checked/selected/disabled) update in the tree on interaction. Read the widget's subtree before and after — scoped, not a full re-snapshot; whether they are announced is ○.
- ○ Live-region and status-message announcement (4.1.3). `aria-live` being present is ●; that it actually announces is assistive-technology only.

**Visual adaptation** — 1.4.4, 1.4.10, 1.4.12, 1.3.4, 2.3.3, 1.4.1, 1.4.11
- ◐ Reflow at 320 CSS px (1.4.10). Resize to 320 wide; check for two-dimensional scrolling or clipped content. One resize, one screenshot.
- ◐ Zoom to 200% and 400% (1.4.4). Approximate with CSS zoom via `evaluate_script` (true browser zoom isn't exposed; note this) and screenshot.
- ◐ Text spacing (1.4.12). Inject the WCAG spacing override and check for clipping.
- ◐ Reduced motion (2.3.3). `emulate` prefers-reduced-motion and observe. Only if the page has motion.
- ◐ Color is not the only signal (1.4.1); non-text and state contrast (1.4.11). Screenshot states; the engine misses text-on-image and focus/hover contrast. Absent programmatic state in the tree is a ● 1.3.1 fact; "color is the sole carrier" is a look — the 1.4.1 finding stays ◐.

**Forms and errors** — 3.3.1–3.3.3, 1.3.5, 3.3.7, 3.3.8
- ● Every field has a programmatic label; `autocomplete`/input-purpose is set where it applies (1.3.5). Both are engine-owned when a scan ran; don't re-derive them.
- ◐ Submit invalid input: errors are programmatically associated (3.3.1, ●) and the message supports recovery (3.3.3, a person confirms).
- ◐ Redundant entry (3.3.7) and accessible authentication (3.3.8). Exercise the flow and note any cognitive burden.

**Media and timing** — 1.2.x, 2.2.1, 2.2.2
- ◐ `<video>`/`<audio>` have caption, transcript, or description tracks present. Presence is detectable; accuracy is ○.
- ◐ Autoplay and moving content can be paused (2.2.2); timeouts can be adjusted (2.2.1).

**Pointer and target** — 2.5.7, 2.5.8, 2.5.1
- ● Interactive targets are at least 24×24 CSS px (2.5.8). The batched walk's bounding boxes settle this; no separate pass.
- ◐ Dragging has a single-pointer alternative (2.5.7); path and multipoint gestures have a simple alternative (2.5.1).

**Content and navigation** — 3.1.1/2, 2.4.4, 3.2.3/4, 3.2.6
- ● `lang` is set on the page and on parts in other languages. Engine-owned when a scan ran.
- ◐ Link and button purpose is clear from the name alone (2.4.4); navigation and identification are consistent across pages (3.2.3/4); help is placed consistently (3.2.6). The cross-page criteria need `accessibility-audit`'s sample; on a single page, ledger them as not exercised.
- ○ Plain-language comprehension and cognitive load. Readable to you is not the same as usable for cognitive disabilities. Hand off.
