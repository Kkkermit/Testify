import mongoose from "mongoose";

/** The counts the bot kept itself before Shardlens: nothing writes them any more, and each row expires on its own. */

const COMMAND_USES = "commandusages";
const SCREEN_VIEWS = "screenviews";
const DASHBOARD_VIEWS = "dashboardviews";

/** What a run outside any server was counted under. */
export const DIRECT_MESSAGE = "DIRECT_MESSAGE";

export interface EarlierTally {
	key: string;
	count: number;
	failures: number;
}

export interface EarlierUses {
	byDay: EarlierTally[];
	byCommand: EarlierTally[];
	byGuild: EarlierTally[];
	bySurface: EarlierTally[];
}

export const NO_EARLIER_USES: EarlierUses = { byDay: [], byCommand: [], byGuild: [], bySurface: [] };

interface Grouped {
	_id: unknown;
	count: unknown;
	failures?: unknown;
}

const amount = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** Rows the bot wrote itself, still checked, since a hand-edited one must not throw a figure off. */
function talliesOf(rows: Grouped[] | undefined): EarlierTally[] {
	return (rows ?? []).flatMap((row) =>
		typeof row._id === "string" ? [{ key: row._id, count: amount(row.count), failures: amount(row.failures) }] : [],
	);
}

const byField = (field: string): object[] => [
	{ $group: { _id: `$${field}`, count: { $sum: "$count" }, failures: { $sum: "$failures" } } },
];

/** Every day from `sinceDay`, a `YYYY-MM-DD` in UTC as the rows were keyed, and only one server's when it is named. */
export async function earlierUses(sinceDay: string, guildId?: string): Promise<EarlierUses> {
	const collection = mongoose.connection.db?.collection(COMMAND_USES);
	if (collection === undefined) return NO_EARLIER_USES;

	const [facets] = await collection
		.aggregate<Partial<Record<keyof EarlierUses, Grouped[]>>>([
			{ $match: { day: { $gte: sinceDay }, ...(guildId === undefined ? {} : { guildId }) } },
			{
				$facet: {
					byDay: byField("day"),
					byCommand: byField("command"),
					byGuild: byField("guildId"),
					bySurface: byField("surface"),
				},
			},
		])
		.toArray();

	return {
		byDay: talliesOf(facets?.byDay),
		byCommand: talliesOf(facets?.byCommand),
		byGuild: talliesOf(facets?.byGuild),
		bySurface: talliesOf(facets?.bySurface),
	};
}

async function viewsBy(name: string, field: string, match: object): Promise<EarlierTally[]> {
	const collection = mongoose.connection.db?.collection(name);
	if (collection === undefined) return [];

	const rows = await collection
		.aggregate<Grouped>([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: "$count" } } }])
		.toArray();
	return talliesOf(rows);
}

/** Dashboard screens by route pattern. */
export async function earlierScreenViews(sinceDay: string): Promise<EarlierTally[]> {
	return viewsBy(SCREEN_VIEWS, "route", { day: { $gte: sinceDay } });
}

/** Dashboard screens opened by a server's own managers, by server. */
export async function earlierDashboardViews(sinceDay: string, guildId?: string): Promise<EarlierTally[]> {
	return viewsBy(DASHBOARD_VIEWS, "guildId", {
		day: { $gte: sinceDay },
		...(guildId === undefined ? {} : { guildId }),
	});
}
