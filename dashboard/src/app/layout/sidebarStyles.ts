/**
 * The two measurements every sidebar row shares.
 *
 * `ICON_SLOT` is a fixed box rather than the icon's own width, because the icons are not all the same width and
 * the labels have to start on one column — at the icon-only rail that column is the whole row.
 */

export const ROW = "flex items-center gap-3 rounded-card px-2 py-2";
export const ICON_SLOT = "flex w-[18px] shrink-0 justify-center";
