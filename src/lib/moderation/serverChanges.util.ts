import { AuditLogEvent, type Guild, PermissionFlagsBits } from "discord.js";
import { type DashboardAudit } from "@database/models/dashboardAudit.schema";
import { auditsSince } from "@database/repositories/dashboardAuditRepository";
import {
	CHANGE_LIMITS,
	type ChangeKind,
	changeMatches,
	type ChangesQuery,
	type ChangeVerb,
	type ServerChange,
	type ServerChangesPage,
} from "@testify/shared";

/** One list of a server's changes, from the dashboard's own records and from Discord's audit log. */

const DAY_MS = 24 * 60 * 60_000;
/** Reading fourteen days of a busy audit log is five requests, so one read serves every search for a minute. */
const DISCORD_CACHE_MS = 60_000;
const PAGE_SIZE = 100;

/** The parts of a discord.js audit entry this module reads, so a test needs no Discord objects to build one. */
export interface AuditEntryLike {
	id: string;
	action: AuditLogEvent;
	actionType: string;
	targetType: string;
	target: unknown;
	executorId: string | null;
	executor: { username?: string | null } | null;
	reason: string | null;
	createdTimestamp: number;
	changes: readonly { key: string; old?: unknown; new?: unknown }[];
}

const KINDS: Record<string, ChangeKind> = {
	Guild: "server",
	Channel: "channel",
	StageInstance: "channel",
	Role: "role",
	User: "member",
	Invite: "invite",
	Webhook: "webhook",
	Emoji: "emoji",
	Sticker: "sticker",
	Message: "message",
	Integration: "integration",
	GuildScheduledEvent: "event",
	Thread: "thread",
	AutoModeration: "automod",
};

const SPECIFIC: Partial<Record<AuditLogEvent, ChangeVerb>> = {
	[AuditLogEvent.MemberKick]: "kicked",
	[AuditLogEvent.MemberBanAdd]: "banned",
	[AuditLogEvent.MemberBanRemove]: "unbanned",
	[AuditLogEvent.MemberRoleUpdate]: "rolesChanged",
	[AuditLogEvent.MemberMove]: "moved",
	[AuditLogEvent.MemberDisconnect]: "disconnected",
	[AuditLogEvent.MemberPrune]: "pruned",
	[AuditLogEvent.MessagePin]: "pinned",
	[AuditLogEvent.MessageUnpin]: "unpinned",
	[AuditLogEvent.BotAdd]: "botAdded",
};

const GENERIC: Record<string, ChangeVerb> = { Create: "created", Update: "updated", Delete: "deleted" };

function verbOf(entry: AuditEntryLike): ChangeVerb {
	const specific = SPECIFIC[entry.action];
	if (specific !== undefined) return specific;

	// A timeout arrives as an ordinary member update whose change sets the end of the timeout.
	const timeout = entry.changes.find((change) => change.key === "communication_disabled_until");
	if (entry.action === AuditLogEvent.MemberUpdate && timeout?.new !== undefined) {
		return "timedOut";
	}

	return GENERIC[entry.actionType] ?? "other";
}

/** The name the thing had, read from the live object first and from the change record once it is deleted. */
function targetName(entry: AuditEntryLike): string | null {
	const target = entry.target;
	if (typeof target === "object" && target !== null) {
		for (const field of ["name", "username", "code"] as const) {
			const value = (target as Record<string, unknown>)[field];
			if (typeof value === "string" && value !== "") return value;
		}
	}

	const renamed = entry.changes.find((change) => change.key === "name");
	const name = renamed?.new ?? renamed?.old;
	return typeof name === "string" ? name : null;
}

export function discordChange(entry: AuditEntryLike): ServerChange {
	return {
		id: entry.id,
		source: "discord",
		at: new Date(entry.createdTimestamp).toISOString(),
		actorId: entry.executorId,
		actorTag: entry.executor?.username ?? entry.executorId ?? "Discord",
		kind: KINDS[entry.targetType] ?? "other",
		verb: verbOf(entry),
		summary: null,
		target: targetName(entry),
		reason: entry.reason,
	};
}

export function dashboardChange(record: DashboardAudit & { _id?: { toString(): string } }): ServerChange {
	return {
		id: record._id?.toString() ?? `${record.at.toISOString()}-${record.action}`,
		source: "dashboard",
		at: record.at.toISOString(),
		actorId: record.actorId,
		actorTag: record.actorTag,
		kind: "settings",
		verb: "updated",
		summary: record.summary,
		target: null,
		reason: null,
	};
}

interface DiscordRead {
	changes: ServerChange[];
	readable: boolean;
	truncated: boolean;
}

type AuditReader = (before: string | undefined) => Promise<AuditEntryLike[]>;

/** Pages back through the audit log until it passes the window or reaches the cap. */
export async function readAuditWindow(read: AuditReader, since: number): Promise<Omit<DiscordRead, "readable">> {
	const changes: ServerChange[] = [];
	let before: string | undefined;

	while (changes.length < CHANGE_LIMITS.maxDiscordEntries) {
		const entries = await read(before);
		for (const entry of entries) {
			if (entry.createdTimestamp < since) return { changes, truncated: false };
			changes.push(discordChange(entry));
		}
		if (entries.length < PAGE_SIZE) return { changes, truncated: false };
		before = entries.at(-1)?.id;
	}

	return { changes, truncated: true };
}

const discordCache = new Map<string, { at: number; read: DiscordRead }>();

async function discordChanges(guild: Guild, now: number): Promise<DiscordRead> {
	if (guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog) !== true) {
		return { changes: [], readable: false, truncated: false };
	}

	const cached = discordCache.get(guild.id);
	if (cached !== undefined && now - cached.at < DISCORD_CACHE_MS) return cached.read;

	const window = await readAuditWindow(
		async (before) => {
			const logs = await guild.fetchAuditLogs({ limit: PAGE_SIZE, ...(before === undefined ? {} : { before }) });
			return [...logs.entries.values()];
		},
		now - CHANGE_LIMITS.maxDays * DAY_MS,
	);
	const read = { ...window, readable: true };

	discordCache.set(guild.id, { at: now, read });
	if (discordCache.size > 500) discordCache.delete(discordCache.keys().next().value ?? guild.id);
	return read;
}

/** Newest first, filtered to the window, source and search, and paged. */
export function pageChanges(
	all: ServerChange[],
	query: ChangesQuery,
	now: number,
): Pick<ServerChangesPage, "items" | "total" | "page" | "perPage"> {
	const since = now - query.days * DAY_MS;
	const matching = all
		.filter((change) => Date.parse(change.at) >= since)
		.filter((change) => query.source === "all" || change.source === query.source)
		.filter((change) => query.q === undefined || changeMatches(change, query.q))
		.sort((a, b) => b.at.localeCompare(a.at));

	const perPage = CHANGE_LIMITS.perPage;
	const pages = Math.max(1, Math.ceil(matching.length / perPage));
	const page = Math.min(query.page, pages);

	return { items: matching.slice((page - 1) * perPage, page * perPage), total: matching.length, page, perPage };
}

export async function readServerChanges(
	guild: Guild,
	query: ChangesQuery,
	now = Date.now(),
): Promise<ServerChangesPage> {
	const since = new Date(now - CHANGE_LIMITS.maxDays * DAY_MS);
	const [records, discord] = await Promise.all([
		query.source === "discord" ? Promise.resolve([]) : auditsSince(guild.id, since),
		query.source === "dashboard"
			? Promise.resolve<DiscordRead>({ changes: [], readable: true, truncated: false })
			: discordChanges(guild, now),
	]);

	return {
		...pageChanges([...records.map(dashboardChange), ...discord.changes], query, now),
		discordReadable: discord.readable,
		truncated: discord.truncated,
	};
}
