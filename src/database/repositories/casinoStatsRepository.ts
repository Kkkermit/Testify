import { type PipelineStage } from "mongoose";
import { CasinoStats } from "@database/models/casinoStats.schema";
import { type CasinoGame } from "@testify/shared";

/** Casino totals, kept as running sums per player per game so a server's history is one aggregation. */

export interface CasinoPlay {
	guildId: string;
	userId: string;
	game: CasinoGame;
	staked: number;
	returned: number;
}

export interface CasinoTotals {
	plays: number;
	wagered: number;
	returned: number;
	wins: number;
	losses: number;
	pushes: number;
	players: number;
	since: Date | null;
}

export interface CasinoStandout {
	userId: string;
	amount: number;
	game?: CasinoGame;
}

export interface CasinoStatsReport {
	totals: CasinoTotals;
	byGame: (Omit<CasinoTotals, "players" | "since"> & { game: CasinoGame })[];
	biggestWin: CasinoStandout | null;
	biggestBet: CasinoStandout | null;
	/** Most ahead overall, and most behind. */
	topWinner: CasinoStandout | null;
	topLoser: CasinoStandout | null;
	mine: Omit<CasinoTotals, "players" | "since"> | null;
}

/** Each play adds to its row in one upsert, so two games settling at once cannot lose either. */
export async function recordCasinoPlays(plays: readonly CasinoPlay[]): Promise<void> {
	if (plays.length === 0) return;

	await CasinoStats.bulkWrite(
		plays.map((play) => {
			const profit = play.returned - play.staked;
			return {
				updateOne: {
					filter: { guildId: play.guildId, game: play.game, userId: play.userId },
					update: {
						$inc: {
							plays: 1,
							wagered: play.staked,
							returned: play.returned,
							wins: profit > 0 ? 1 : 0,
							losses: profit < 0 ? 1 : 0,
							pushes: profit === 0 ? 1 : 0,
						},
						$max: { biggestWin: Math.max(0, profit), biggestBet: play.staked },
					},
					upsert: true,
				},
			};
		}),
		{ ordered: false },
	);
}

const SUMS = {
	plays: { $sum: "$plays" },
	wagered: { $sum: "$wagered" },
	returned: { $sum: "$returned" },
	wins: { $sum: "$wins" },
	losses: { $sum: "$losses" },
	pushes: { $sum: "$pushes" },
} as const;

const NO_ID = { _id: 0 } as const;

function standout(field: "biggestWin" | "biggestBet"): PipelineStage.FacetPipelineStage[] {
	return [
		{ $match: { [field]: { $gt: 0 } } },
		{ $sort: { [field]: -1, updatedAt: 1 } },
		{ $limit: 1 },
		{ $project: { ...NO_ID, userId: 1, game: 1, amount: `$${field}` } },
	];
}

function netRanking(order: 1 | -1): PipelineStage.FacetPipelineStage[] {
	return [
		{ $group: { _id: "$userId", amount: { $sum: { $subtract: ["$returned", "$wagered"] } } } },
		{ $match: { amount: order === -1 ? { $gt: 0 } : { $lt: 0 } } },
		{ $sort: { amount: order, _id: 1 } },
		{ $limit: 1 },
		{ $project: { ...NO_ID, userId: "$_id", amount: 1 } },
	];
}

interface Faceted {
	totals: (Omit<CasinoTotals, "players"> & { players: string[] })[];
	byGame: CasinoStatsReport["byGame"];
	biggestWin: CasinoStandout[];
	biggestBet: CasinoStandout[];
	topWinner: CasinoStandout[];
	topLoser: CasinoStandout[];
	mine: NonNullable<CasinoStatsReport["mine"]>[];
}

/** One server's casino, or one game in it, with the reader's own record beside it. */
export async function readCasinoStats(
	guildId: string,
	game: CasinoGame | null,
	userId: string,
): Promise<CasinoStatsReport> {
	const [result] = await CasinoStats.aggregate<Faceted>([
		{ $match: { guildId, ...(game === null ? {} : { game }) } },
		{
			$facet: {
				totals: [
					{ $group: { _id: null, ...SUMS, players: { $addToSet: "$userId" }, since: { $min: "$createdAt" } } },
					{ $project: NO_ID },
				],
				byGame: [
					{ $group: { _id: "$game", ...SUMS } },
					{ $sort: { wagered: -1, _id: 1 } },
					{ $set: { game: "$_id" } },
					{ $project: NO_ID },
				],
				biggestWin: standout("biggestWin"),
				biggestBet: standout("biggestBet"),
				topWinner: netRanking(-1),
				topLoser: netRanking(1),
				mine: [{ $match: { userId } }, { $group: { _id: null, ...SUMS } }, { $project: NO_ID }],
			},
		},
	]).exec();

	const totals = result?.totals[0];
	return {
		totals:
			totals === undefined
				? { plays: 0, wagered: 0, returned: 0, wins: 0, losses: 0, pushes: 0, players: 0, since: null }
				: { ...totals, players: totals.players.length },
		byGame: result?.byGame ?? [],
		biggestWin: result?.biggestWin[0] ?? null,
		biggestBet: result?.biggestBet[0] ?? null,
		topWinner: result?.topWinner[0] ?? null,
		topLoser: result?.topLoser[0] ?? null,
		mine: result?.mine[0] ?? null,
	};
}

export async function purgeCasinoStats(guildId: string): Promise<void> {
	await CasinoStats.deleteMany({ guildId }).exec();
}
