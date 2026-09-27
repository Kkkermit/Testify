import { ChannelType, type Guild, GuildVerificationLevel } from "discord.js";
import { type Logger } from "pino";
import { toError } from "@core/errors";
import { type ServerDay } from "@database/models/insights.schema";
import { readInsightRows, recentMoves, recordMove, saveActivity } from "@database/repositories/insightsRepository";
import { dayKey, since } from "@database/repositories/usageRepository";
import { activity } from "@lib/info/activity.util";
import { readMemberCounts } from "@lib/info/memberCount.util";
import {
	type InsightDay,
	type InsightsReport,
	type InsightWindow,
	type MemberMove,
	type ServerFacts,
	type VerificationLevel,
} from "@testify/shared";

/** A server's insights: what Discord says about it, and what the bot has counted there. */

/** Writes what has been counted since the last flush; a failed write is kept for the next one. */
export async function flushActivity(logger: Pick<Logger, "debug" | "warn">): Promise<void> {
	const batch = activity.drain();
	if (batch.servers.length === 0) return;

	try {
		await saveActivity(batch);
	} catch (error) {
		activity.restore(batch);
		logger.warn({ err: toError(error) }, "[INSIGHTS] Could not save activity counts. They will be retried.");
	}
}

/** Records a join or a leave without holding up the welcome or the audit log if the database is slow. */
export function countMove(
	client: { logger: Pick<Logger, "debug"> },
	member: { guild: { id: string }; id: string; user: { username: string } },
	kind: "join" | "leave",
): void {
	recordMove({ guildId: member.guild.id, userId: member.id, username: member.user.username, kind }).catch(
		(error: unknown) => {
			client.logger.debug({ err: toError(error) }, "[INSIGHTS] Could not record a member joining or leaving");
		},
	);
}

const VERIFICATION: Record<GuildVerificationLevel, VerificationLevel> = {
	[GuildVerificationLevel.None]: "none",
	[GuildVerificationLevel.Low]: "low",
	[GuildVerificationLevel.Medium]: "medium",
	[GuildVerificationLevel.High]: "high",
	[GuildVerificationLevel.VeryHigh]: "highest",
};

export async function serverFacts(guild: Guild): Promise<ServerFacts> {
	const counts = await readMemberCounts(guild);
	const channels = [...guild.channels.cache.values()];
	const count = (...types: ChannelType[]) => channels.filter((channel) => types.includes(channel.type)).length;

	return {
		createdAt: guild.createdAt.toISOString(),
		ownerId: guild.ownerId,
		ownerName: guild.members.cache.get(guild.ownerId)?.user.username ?? null,
		members: counts.total,
		people: counts.people,
		bots: counts.bots,
		textChannels: count(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum),
		voiceChannels: count(ChannelType.GuildVoice, ChannelType.GuildStageVoice),
		categories: count(ChannelType.GuildCategory),
		// Less the @everyone role, which every server has and nobody counts as one of theirs.
		roles: Math.max(0, guild.roles.cache.size - 1),
		emojis: guild.emojis.cache.size,
		stickers: guild.stickers.cache.size,
		boostTier: guild.premiumTier,
		boosts: guild.premiumSubscriptionCount ?? 0,
		verification: VERIFICATION[guild.verificationLevel],
	};
}

/** Every day of the window, oldest first, so a quiet day shows as zero rather than as a gap. */
export function fillDays(rows: readonly ServerDay[], days: number, now: Date): InsightDay[] {
	const byDay = new Map(rows.map((row) => [row.day, row]));

	return Array.from({ length: days }, (_, index) => {
		const day = dayKey(new Date(now.getTime() - (days - 1 - index) * 24 * 60 * 60 * 1000));
		const row = byDay.get(day);
		return { day, messages: row?.messages ?? 0, joins: row?.joins ?? 0, leaves: row?.leaves ?? 0 };
	});
}

export function hoursOf(rows: readonly ServerDay[]): number[] {
	const hours = Array.from({ length: 24 }, () => 0);
	for (const row of rows) {
		for (const [hour, count] of Object.entries(row.hours ?? {})) {
			const index = Number(hour);
			if (Number.isInteger(index) && index >= 0 && index < 24) hours[index] = (hours[index] ?? 0) + count;
		}
	}

	return hours;
}

export async function readInsights(guild: Guild, days: InsightWindow, now: Date = new Date()): Promise<InsightsReport> {
	const [server, rows, joins, leaves] = await Promise.all([
		serverFacts(guild),
		readInsightRows(guild.id, since(days, now)),
		recentMoves(guild.id, "join"),
		recentMoves(guild.id, "leave"),
	]);

	const daily = fillDays(rows.days, days, now);
	const sum = (pick: (day: InsightDay) => number) => daily.reduce((total, day) => total + pick(day), 0);
	const move = (record: { userId: string; username: string; at: Date }): MemberMove => ({
		userId: record.userId,
		name: guild.members.cache.get(record.userId)?.displayName ?? record.username,
		at: record.at.toISOString(),
	});

	return {
		days,
		server,
		countingSince: rows.firstDay,
		totals: {
			messages: sum((day) => day.messages),
			activeMembers: rows.activeMembers,
			joins: sum((day) => day.joins),
			leaves: sum((day) => day.leaves),
		},
		daily,
		hours: hoursOf(rows.days),
		topChannels: rows.channels.map((row) => ({
			channelId: row.channelId,
			name: guild.channels.cache.get(row.channelId)?.name ?? null,
			messages: row.messages,
		})),
		topMembers: rows.members.map((row) => {
			const member = guild.members.cache.get(row.userId);
			return {
				userId: row.userId,
				name: member?.displayName ?? row.userId,
				avatarUrl: member?.displayAvatarURL({ size: 64 }) ?? null,
				messages: row.messages,
			};
		}),
		recentJoins: joins.map(move),
		recentLeaves: leaves.map(move),
	};
}
