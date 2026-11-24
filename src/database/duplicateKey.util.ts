/** 11000 is MongoDB's duplicate key: a unique index refused the write, which is how the repositories settle a race. */
export function isDuplicateKey(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === 11_000;
}
