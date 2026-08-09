/**
 * WCAG 2.2 target size (2.5.8, AA): 24×24 CSS pixels.
 *
 * A line of `text-sm` is 20px tall, so any control that is just text — a back link, an inline external link,
 * a bare switch — misses it by 4px unless it is told not to. `Button` already clears it with `min-h-11`.
 */
export const INLINE_TARGET = "inline-flex min-h-6 items-center";
