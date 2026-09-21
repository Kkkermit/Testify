/**
 * The heading on a card.
 *
 * `leading-tight` is on the string rather than in `@theme` or the base layer because a Tailwind size utility
 * carries its own `line-height` and beats both. Without it a card heading sits at body spacing.
 */
export const CARD_HEADING = "font-display text-base leading-tight font-bold tracking-tight";

/** The `<h1>` on a page, wherever that page renders — the app shell's header and both auth screens alike. */
export const PAGE_TITLE = "font-display text-[1.75rem] leading-tight font-bold tracking-tight";
