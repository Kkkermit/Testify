/** A page number out of a URL can be anything at all. */
export function pageFrom(raw: string | null): number {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export function formatUptime(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${String(days)}d ${String(hours % 24)}h`;
	if (hours > 0) return `${String(hours)}h ${String(minutes % 60)}m`;

	return `${String(minutes)}m`;
}

export function pageCount(total: number, perPage: number): number {
	if (perPage <= 0) return 1;
	return Math.max(1, Math.ceil(total / perPage));
}
