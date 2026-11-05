import { type Guild, type GuildMember } from "discord.js";
import { warningCounts } from "@database/repositories/moderationRepository";
import { moderationBlock } from "@lib/moderation/moderationActions.util";
import { grantableRoles } from "@lib/roles/memberRoles.util";
import {
	DIRECTORY_LIMITS,
	type DirectoryAbilities,
	type DirectoryPage,
	type DirectoryQuery,
	type DirectoryRow,
	idFromQuery,
	JOINED_WITHIN_MS,
	type MemberBlock,
} from "@testify/shared";

/** Everybody in a server, read live from Discord a page at a time, so a server of 100,000 is never fetched whole. */

export interface DirectoryReader {
	/** Null for a bot owner who is not in the server, who can read the list but moderate nobody. */
	moderator: GuildMember | null;
	/** Undefined is a bot owner, held only to what the bot can give. */
	reach: GuildMember | undefined;
	botId: string | undefined;
	can: DirectoryAbilities;
}

interface Batch {
	members: GuildMember[];
	/** The furthest id this batch looked at, which can pass every member in it when some have left. */
	reached: string | undefined;
	done: boolean;
}

type Source = (after: string | undefined) => Promise<Batch>;

/** Snowflakes compared as the numbers they are, without a BigInt per comparison. */
export function compareIds(a: string, b: string): number {
	return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

const byId = (a: GuildMember, b: GuildMember): number => compareIds(a.id, b.id);

function isAfter(id: string, after: string | undefined): boolean {
	return after === undefined || compareIds(id, after) > 0;
}

function settled(members: GuildMember[]): Source {
	const sorted = [...members].sort(byId);
	return (after) =>
		Promise.resolve({ members: sorted.filter((m) => isAfter(m.id, after)), reached: undefined, done: true });
}

function listing(guild: Guild): Source {
	return async (after) => {
		const page = await guild.members.list({
			limit: DIRECTORY_LIMITS.readBatch,
			...(after === undefined ? {} : { after }),
		});
		const members = [...page.values()].sort(byId);
		return { members, reached: members.at(-1)?.id, done: members.length < DIRECTORY_LIMITS.readBatch };
	};
}

/** Discord fetches at most 100 members by id at once. */
const BY_ID_CHUNK = 100;

function only(guild: Guild, userIds: readonly string[]): Source {
	const sorted = [...userIds].sort(compareIds);
	return async (after) => {
		const chunk = sorted.filter((id) => isAfter(id, after)).slice(0, BY_ID_CHUNK);
		if (chunk.length === 0) return { members: [], reached: after, done: true };

		const found = await guild.members.fetch({ user: chunk });
		return { members: [...found.values()].sort(byId), reached: chunk.at(-1), done: chunk.length < BY_ID_CHUNK };
	};
}

async function sourceFor(
	guild: Guild,
	query: DirectoryQuery,
	warned: Map<string, number> | null,
): Promise<{ source: Source; searchCut: boolean }> {
	if (query.q !== undefined) {
		const id = idFromQuery(query.q);
		if (id !== null) {
			const member = await guild.members.fetch(id).catch(() => null);
			return { source: settled(member === null ? [] : [member]), searchCut: false };
		}

		const found = await guild.members.search({ query: query.q, limit: DIRECTORY_LIMITS.readBatch });
		return { source: settled([...found.values()]), searchCut: found.size >= DIRECTORY_LIMITS.readBatch };
	}

	if (query.warned && warned !== null) return { source: only(guild, [...warned.keys()]), searchCut: false };

	return { source: listing(guild), searchCut: false };
}

export function matchesFilters(
	member: GuildMember,
	query: DirectoryQuery,
	warned: Map<string, number> | null,
	now = Date.now(),
): boolean {
	if (query.kind === "people" && member.user.bot) return false;
	if (query.kind === "bots" && !member.user.bot) return false;
	if (query.roleId !== undefined && !member.roles.cache.has(query.roleId)) return false;
	if (query.joined !== "any") {
		if (member.joinedTimestamp === null || now - member.joinedTimestamp > JOINED_WITHIN_MS[query.joined]) return false;
	}
	if (query.timedOut && timedOutUntil(member, now) === null) return false;
	if (query.warned && (warned?.get(member.id) ?? 0) === 0) return false;

	return true;
}

function timedOutUntil(member: GuildMember, now: number): string | null {
	const until = member.communicationDisabledUntilTimestamp;
	return until !== null && until > now ? new Date(until).toISOString() : null;
}

async function collect(
	source: Source,
	after: string | undefined,
	keep: (member: GuildMember) => boolean,
): Promise<{ members: GuildMember[]; next: string | null; scanStopped: boolean }> {
	const kept: GuildMember[] = [];
	let cursor = after;
	let scanned = 0;

	// In order, because each read starts where the last one ended.
	for (;;) {
		const batch = await source(cursor);
		for (const [index, member] of batch.members.entries()) {
			scanned += 1;
			if (keep(member)) kept.push(member);
			if (kept.length === DIRECTORY_LIMITS.pageSize) {
				const more = index < batch.members.length - 1 || !batch.done;
				return { members: kept, next: more ? member.id : null, scanStopped: false };
			}
		}

		if (batch.done) return { members: kept, next: null, scanStopped: false };
		cursor = batch.reached ?? cursor;
		if (scanned >= DIRECTORY_LIMITS.maxScan) return { members: kept, next: cursor ?? null, scanStopped: true };
	}
}

export function rowOf(
	member: GuildMember,
	reader: DirectoryReader,
	counts: Map<string, number> | null,
	now = Date.now(),
): DirectoryRow {
	const block: MemberBlock | null =
		reader.moderator === null ? "notMember" : moderationBlock(reader.moderator, member, reader.botId);

	return {
		userId: member.id,
		displayName: member.displayName,
		username: member.user.username,
		avatarUrl: member.displayAvatarURL({ size: 64 }),
		isBot: member.user.bot,
		joinedAt: member.joinedAt?.toISOString() ?? null,
		timedOutUntil: timedOutUntil(member, now),
		roleIds: [...member.roles.cache.values()]
			.filter((role) => role.id !== member.guild.id)
			.sort((a, b) => b.position - a.position)
			.map((role) => role.id),
		warnings: counts === null ? null : (counts.get(member.id) ?? 0),
		block,
	};
}

export async function readDirectory(
	guild: Guild,
	query: DirectoryQuery,
	reader: DirectoryReader,
): Promise<DirectoryPage> {
	// Counts are read only for somebody who may see warnings, which the route has already asked of a warned filter.
	const counts = reader.can.warn ? await warningCounts(guild.id) : null;
	const { source, searchCut } = await sourceFor(guild, query, counts);
	const now = Date.now();
	const { members, next, scanStopped } = await collect(source, query.after, (member) =>
		matchesFilters(member, query, counts, now),
	);

	return {
		rows: members.map((member) => rowOf(member, reader, counts, now)),
		next,
		scanStopped,
		searchCut,
		memberCount: guild.memberCount,
		roles: [...guild.roles.cache.values()]
			.filter((role) => role.id !== guild.id)
			.sort((a, b) => b.position - a.position)
			.map((role) => ({ id: role.id, name: role.name, colour: role.hexColor === "#000000" ? null : role.hexColor })),
		grantable: reader.can.roles ? grantableRoles(guild, reader.reach).map((role) => role.id) : [],
		can: reader.can,
	};
}
