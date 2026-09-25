/** A page number out of a URL can be anything at all. */
export function pageFrom(raw: string | null): number {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function pageCount(total: number, perPage: number): number {
	if (perPage <= 0) return 1;
	return Math.max(1, Math.ceil(total / perPage));
}

export interface Paged<T> {
	items: T[];
	page: number;
	pages: number;
}

/** Clamped, so a page left in the URL after the list shrank shows its last page rather than an empty one. */
export function pageOf<T>(items: readonly T[], requested: number, perPage: number): Paged<T> {
	const pages = pageCount(items.length, perPage);
	const page = Math.min(Math.max(1, requested), pages);

	return { items: items.slice((page - 1) * perPage, page * perPage), page, pages };
}

/** The page numbers a pager offers: `reach` either side of the current one, slid in from an end so the count holds. */
export function pageWindow(page: number, pages: number, reach = 2): number[] {
	const width = Math.min(pages, reach * 2 + 1);
	const first = Math.min(Math.max(1, page - reach), pages - width + 1);

	return Array.from({ length: width }, (_unused, index) => first + index);
}
