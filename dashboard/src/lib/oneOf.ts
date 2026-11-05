export function oneOf<T extends string>(options: readonly T[], value: string | null | undefined, fallback: T): T {
	return options.find((option) => option === value) ?? fallback;
}
