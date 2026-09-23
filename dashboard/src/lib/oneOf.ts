/** Narrows a loose string to one of a known set without a type assertion, falling back when it matches none. */
export function oneOf<T extends string>(options: readonly T[], value: string | null | undefined, fallback: T): T {
	return options.find((option) => option === value) ?? fallback;
}
