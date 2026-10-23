import { type PipelineStage } from "mongoose";
import { type CommandRunRecord, CommandRuns } from "@database/models/commandRuns.schema";
import { since, type Surface } from "@database/repositories/usageRepository";
import { RUN_RETENTION_DAYS } from "@testify/shared";

/** Who ran which command in a server, for the owner console. Runs in a direct message are never written. */

const DAY_MS = 24 * 60 * 60 * 1000;

function windowStart(days: number, now?: Date): Date {
	return new Date(`${since(days, now)}T00:00:00.000Z`);
}

export interface RunRecord {
	guildId: string;
	channelId: string | null;
	userId: string;
	username: string;
	command: string;
	subcommand: string | null;
	surface: Surface;
	failed: boolean;
	reference: string | null;
	durationMs: number;
}

export async function recordCommandRun(run: RunRecord, now: Date = new Date()): Promise<void> {
	await CommandRuns.create({ ...run, at: now, expiresAt: new Date(now.getTime() + RUN_RETENTION_DAYS * DAY_MS) });
}

export interface MemberTally {
	userId: string;
	/** The name they had on their most recent run. */
	username: string;
	runs: number;
	failures: number;
	prefix: number;
	/** Busiest first. */
	commands: { command: string; count: number }[];
	lastAt: Date;
}

/** Everybody who ran a command in the server in the window, busiest first. */
export async function memberTallies(guildId: string, days: number, now?: Date): Promise<MemberTally[]> {
	const rows = await CommandRuns.aggregate<{
		_id: string;
		runs: number;
		failures: number;
		prefix: number;
		// Documents compare field by field, so the greatest `{ at, username }` is the latest run's name.
		latest: { at: Date; username: string };
		commands: { command: string; count: number }[];
	}>([
		{ $match: { guildId, at: { $gte: windowStart(days, now) } } },
		{
			$group: {
				_id: { userId: "$userId", command: "$command" },
				count: { $sum: 1 },
				failures: { $sum: { $cond: ["$failed", 1, 0] } },
				prefix: { $sum: { $cond: [{ $eq: ["$surface", "prefix"] }, 1, 0] } },
				latest: { $max: { at: "$at", username: "$username" } },
			},
		},
		{
			$group: {
				_id: "$_id.userId",
				runs: { $sum: "$count" },
				failures: { $sum: "$failures" },
				prefix: { $sum: "$prefix" },
				latest: { $max: "$latest" },
				commands: { $push: { command: "$_id.command", count: "$count" } },
			},
		},
	]).exec();

	return rows
		.map((row) => ({
			userId: row._id,
			username: row.latest.username,
			runs: row.runs,
			failures: row.failures,
			prefix: row.prefix,
			commands: row.commands.sort((a, b) => b.count - a.count || a.command.localeCompare(b.command)),
			lastAt: row.latest.at,
		}))
		.sort((a, b) => b.runs - a.runs || b.lastAt.getTime() - a.lastAt.getTime());
}

/** How many different people ran a command there. */
export async function activeMembers(guildId: string, days: number, now?: Date): Promise<number> {
	return (await CommandRuns.distinct("userId", { guildId, at: { $gte: windowStart(days, now) } }).exec()).length;
}

export interface SlowTally {
	command: string;
	runs: number;
	typicalMs: number;
	slowMs: number;
}

/** Every command run in a server, slowest first by the time its slowest one in twenty took. Needs MongoDB 7.0. */
export async function slowestCommands(days: number, limit: number, now?: Date): Promise<SlowTally[]> {
	const rows = await CommandRuns.aggregate<{ _id: string; runs: number; times: [number, number] }>([
		{ $match: { at: { $gte: windowStart(days, now) } } },
		// Mongoose's types predate `$percentile`, which MongoDB added in 7.0.
		{
			$group: {
				_id: "$command",
				runs: { $sum: 1 },
				times: { $percentile: { input: "$durationMs", p: [0.5, 0.95], method: "approximate" } },
			},
		} as unknown as PipelineStage,
		{ $sort: { "times.1": -1, _id: 1 } },
		{ $limit: limit },
	]).exec();

	return rows.map((row) => ({
		command: row._id,
		runs: row.runs,
		typicalMs: Math.round(row.times[0]),
		slowMs: Math.round(row.times[1]),
	}));
}

export interface RunFilter {
	userId?: string;
	command?: string;
}

/** Newest first, a page at a time. */
export async function recentRuns(
	guildId: string,
	days: number,
	filter: RunFilter,
	page: { skip: number; limit: number },
	now?: Date,
): Promise<{ items: CommandRunRecord[]; total: number }> {
	const query = {
		guildId,
		at: { $gte: windowStart(days, now) },
		...(filter.userId === undefined ? {} : { userId: filter.userId }),
		...(filter.command === undefined ? {} : { command: filter.command }),
	};

	const [items, total] = await Promise.all([
		CommandRuns.find(query)
			.sort({ at: -1, _id: -1 })
			.skip(page.skip)
			.limit(page.limit)
			.lean<CommandRunRecord[]>()
			.exec(),
		CommandRuns.countDocuments(query).exec(),
	]);

	return { items, total };
}
