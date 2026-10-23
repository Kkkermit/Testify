import { IDEA_STATUSES, type IdeaFilter } from "@testify/shared";

const FILTERS: readonly IdeaFilter[] = ["all", ...IDEA_STATUSES];

/** A filter from the URL; anything the API would refuse reads as every idea. */
export function ideaFilterFrom(value: string | null): IdeaFilter {
	return FILTERS.find((filter) => filter === value) ?? "all";
}

export function pageFrom(value: string | null): number {
	const page = Number(value);
	return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function pageCount(total: number, perPage: number): number {
	return Math.max(1, Math.ceil(total / perPage));
}
