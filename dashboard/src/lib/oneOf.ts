/**
 * Narrows a loose string to one of a known set, without asserting it.
 *
 * A URL parameter, a `<select>` value and `localStorage` can all hold anything at all, and `value as Tab` only
 * promises otherwise. `find` on a `readonly T[]` already returns `T | undefined`, so the union is proved rather
 * than asserted, and an unrecognised value lands on the fallback instead of typechecking its way onto a screen.
 */
export function oneOf<T extends string>(options: readonly T[], value: string | null | undefined, fallback: T): T {
	return options.find((option) => option === value) ?? fallback;
}
