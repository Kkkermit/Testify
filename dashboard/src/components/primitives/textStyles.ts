/**
 * The heading on a card, written 28 times identically before it had a name.
 *
 * `leading-tight` is on the string rather than in `@theme` or the base layer because a Tailwind size utility
 * carries its own `line-height` and beats both — the same reason the select's chevron room lives on `SELECT`.
 * Without it a card heading sits at 1.5, which is body spacing, and only the size distinguishes it from a
 * paragraph.
 */
export const CARD_HEADING = "font-display text-base leading-tight font-bold tracking-tight";
