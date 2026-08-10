import { ANALYTICS } from "@config/constants";
import { type CommandUsage, CommandUsages } from "@database/models/analytics.schema";
import { ScreenViews } from "@database/models/screenViews.schema";

/** Command usage, counted rather than logged. Every query here is scoped to a window of whole UTC days. */

/** Stands in for a guild id when a command was run outside a server. */
export const DIRECT_MESSAGE = "DIRECT_MESSAGE";

export type Surface = CommandUsage["surface"];

export function dayKey(at: Date = new Date()): string {
	return at.toISOString().slice(0, 10);
}

/** The oldest day still inside a window, inclusive, so `day >= since` selects it. */
export function since(days: number, now: Date = new Date()): string {
	return dayKey(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
}

export interface UseRecord {
	command: string;
	guildId: string | null;
	surface: Surface;
	failed: boolean;
}

/**
 * One atomic upsert per invocation. `$setOnInsert` puts the expiry on the row when it is created, so the TTL
 * index reaps a whole day at once rather than sliding forward every time the day is used again.
 */
export async function recordCommandUse(use: UseRecord, now: Date = new Date()): Promise<void> {
	const expiresAt = new Date(now.getTime() + ANALYTICS.retentionDays * 24 * 60 * 60 * 1000);

	await CommandUsages.updateOne(
		{ day: dayKey(now), guildId: use.guildId ?? DIRECT_MESSAGE, command: use.command, surface: use.surface },
		{ $inc: { count: 1, failures: use.failed ? 1 : 0 }, $setOnInsert: { expiresAt } },
		{ upsert: true },
	).exec();
}

export interface UsageTotals {
	runs: number;
	failures: number;
	/** Servers that ran at least one command in the window, which is activity rather than fleet size. */
	activeGuilds: number;
	commandsUsed: number;
}

export async function usageTotals(days: number, now?: Date): Promise<UsageTotals> {
	const [row] = await CommandUsages.aggregate<{
		runs: number;
		failures: number;
		guilds: string[];
		commands: string[];
	}>([
		{ $match: { day: { $gte: since(days, now) } } },
		{
			$group: {
				_id: null,
				runs: { $sum: "$count" },
				failures: { $sum: "$failures" },
				guilds: { $addToSet: "$guildId" },
				commands: { $addToSet: "$command" },
			},
		},
	]).exec();

	if (row === undefined) return { runs: 0, failures: 0, activeGuilds: 0, commandsUsed: 0 };

	return {
		runs: row.runs,
		failures: row.failures,
		activeGuilds: row.guilds.filter((id) => id !== DIRECT_MESSAGE).length,
		commandsUsed: row.commands.length,
	};
}

export interface CommandTally {
	command: string;
	count: number;
	failures: number;
}

/** Every command that ran in the window, busiest first. `limit` of 0 means all of them. */
export async function commandTallies(days: number, limit = 0, now?: Date): Promise<CommandTally[]> {
	return CommandUsages.aggregate<CommandTally>([
		{ $match: { day: { $gte: since(days, now) } } },
		{ $group: { _id: "$command", count: { $sum: "$count" }, failures: { $sum: "$failures" } } },
		{ $sort: { count: -1, _id: 1 } },
		...(limit > 0 ? [{ $limit: limit }] : []),
		{ $project: { _id: 0, command: "$_id", count: 1, failures: 1 } },
	]).exec();
}

export interface GuildTally {
	guildId: string;
	count: number;
}

export async function guildTallies(days: number, limit = 0, now?: Date): Promise<GuildTally[]> {
	return CommandUsages.aggregate<GuildTally>([
		{ $match: { day: { $gte: since(days, now) }, guildId: { $ne: DIRECT_MESSAGE } } },
		{ $group: { _id: "$guildId", count: { $sum: "$count" } } },
		{ $sort: { count: -1, _id: 1 } },
		...(limit > 0 ? [{ $limit: limit }] : []),
		{ $project: { _id: 0, guildId: "$_id", count: 1 } },
	]).exec();
}

export interface DayTally {
	day: string;
	count: number;
	failures: number;
}

/** Only days with activity come back; the caller fills the gaps, because a missing day is a zero. */
export async function dailyTallies(days: number, now?: Date): Promise<DayTally[]> {
	return CommandUsages.aggregate<DayTally>([
		{ $match: { day: { $gte: since(days, now) } } },
		{ $group: { _id: "$day", count: { $sum: "$count" }, failures: { $sum: "$failures" } } },
		{ $sort: { _id: 1 } },
		{ $project: { _id: 0, day: "$_id", count: 1, failures: 1 } },
	]).exec();
}

/** Whether anybody still types the prefix, which is the one thing that decides if it is worth maintaining. */
export async function surfaceTallies(days: number, now?: Date): Promise<Record<Surface, number>> {
	const rows = await CommandUsages.aggregate<{ surface: Surface; count: number }>([
		{ $match: { day: { $gte: since(days, now) } } },
		{ $group: { _id: "$surface", count: { $sum: "$count" } } },
		{ $project: { _id: 0, surface: "$_id", count: 1 } },
	]).exec();

	const totals: Record<Surface, number> = { slash: 0, prefix: 0 };
	for (const row of rows) totals[row.surface] = row.count;

	return totals;
}

/**
 * Dashboard screen views, counted the same way commands are but without a guild id — see the note on
 * `screenViews.schema.ts` for why that one field is the difference between an aggregate and a browsing history.
 */
export async function recordScreenView(route: string, now: Date = new Date()): Promise<void> {
	const expiresAt = new Date(now.getTime() + ANALYTICS.retentionDays * 24 * 60 * 60 * 1000);

	await ScreenViews.updateOne(
		{ day: dayKey(now), route },
		{ $inc: { count: 1 }, $setOnInsert: { expiresAt } },
		{ upsert: true },
	).exec();
}

export interface ScreenTally {
	route: string;
	count: number;
}

export async function screenTallies(days: number, limit = 0, now?: Date): Promise<ScreenTally[]> {
	const rows = await ScreenViews.aggregate<{ _id: string; count: number }>([
		{ $match: { day: { $gte: since(days, now) } } },
		{ $group: { _id: "$route", count: { $sum: "$count" } } },
		{ $sort: { count: -1, _id: 1 } },
		...(limit > 0 ? [{ $limit: limit }] : []),
	]).exec();

	return rows.map((row) => ({ route: row._id, count: row.count }));
}
