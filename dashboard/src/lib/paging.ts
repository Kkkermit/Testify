export function pageFrom(raw: string | null): number {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function pageCount(total: number, perPage: number): number {
	if (perPage <= 0) return 1;
	return Math.max(1, Math.ceil(total / perPage));
}

interface Paged<T> {
	items: T[];
	page: number;
	pages: number;
}

export function pageOf<T>(items: readonly T[], requested: number, perPage: number): Paged<T> {
	const pages = pageCount(items.length, perPage);
	const page = Math.min(Math.max(1, requested), pages);

	return { items: items.slice((page - 1) * perPage, page * perPage), page, pages };
}

export function pageWindow(page: number, pages: number, reach = 2): number[] {
	const width = Math.min(pages, reach * 2 + 1);
	const first = Math.min(Math.max(1, page - reach), pages - width + 1);

	return Array.from({ length: width }, (_unused, index) => first + index);
}

/** A list read a page at a time from a cursor: every page's cursor met so far, and the one showing. */
export interface CursorTrail {
	cursors: readonly (string | null)[];
	at: number;
	/** The furthest page answered with no page after it. */
	ended: boolean;
}

/** A page of such a list, carrying the cursor for the page after it, or null at the end. */
interface CursorPage {
	next: string | null;
}

export const FIRST_CURSOR_PAGE: CursorTrail = { cursors: [null], at: 0, ended: false };

export const cursorAt = (trail: CursorTrail): string | null => trail.cursors[trail.at] ?? null;

/** What the pager offers: every page whose cursor is known, and the one after the page showing once it has answered. */
export function trailPages(
	trail: CursorTrail,
	answer: CursorPage | undefined,
): { page: number; pages: number; more: boolean } {
	const furthest = trail.at === trail.cursors.length - 1;
	const page = trail.at + 1;
	if (!furthest || answer === undefined) return { page, pages: trail.cursors.length, more: !trail.ended };
	return answer.next === null
		? { page, pages: trail.cursors.length, more: false }
		: { page, pages: trail.cursors.length + 1, more: true };
}

/** Leaving the furthest page keeps what it answered, so its next cursor, or the end, is remembered. */
export function turnTo(trail: CursorTrail, page: number, answer: CursorPage | undefined): CursorTrail {
	let { cursors, ended } = trail;
	if (trail.at === cursors.length - 1 && answer !== undefined) {
		if (answer.next === null) ended = true;
		else cursors = [...cursors, answer.next];
	}
	return { cursors, ended, at: Math.min(Math.max(page - 1, 0), cursors.length - 1) };
}
