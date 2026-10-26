import { type Guild, PermissionFlagsBits } from "discord.js";
import { listActiveSoftbans } from "@database/repositories/moderationRepository";
import { BAN_LIMITS, type BanEntry, type BanPage } from "@testify/shared";

/** A server's bans as Discord holds them, newest softbans marked, searched and paged for the dashboard. */

/** An ID matches exactly, a name or a reason anywhere in it, so a pasted `<@id>` and a half-remembered name both work. */
export function banMatches(entry: BanEntry, query: string): boolean {
	const typed = query.trim().toLowerCase();
	if (typed === "") return true;

	const id = /^<@!?(\d{17,20})>$/.exec(typed)?.[1] ?? (/^\d{17,20}$/.test(typed) ? typed : null);
	if (id !== null) return entry.userId === id;

	return entry.username.toLowerCase().includes(typed) || (entry.reason ?? "").toLowerCase().includes(typed);
}

export async function readBans(guild: Guild, options: { page: number; query: string }): Promise<BanPage> {
	const empty = { items: [], total: 0, page: 1, perPage: BAN_LIMITS.perPage, truncated: false };
	if (guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers) !== true) return { readable: false, ...empty };

	const [bans, softbans] = await Promise.all([
		guild.bans.fetch({ limit: BAN_LIMITS.maxRead, cache: false }),
		listActiveSoftbans(guild.id),
	]);
	const endsAt = new Map(softbans.map((softban) => [softban.userId, softban.expiresAt.toISOString()]));

	const all: BanEntry[] = [...bans.values()]
		.map((ban) => ({
			userId: ban.user.id,
			username: ban.user.username,
			avatarUrl: ban.user.displayAvatarURL({ size: 64 }),
			reason: ban.reason ?? null,
			softbanEndsAt: endsAt.get(ban.user.id) ?? null,
		}))
		.sort((a, b) => a.username.localeCompare(b.username));

	const matching = all.filter((entry) => banMatches(entry, options.query));
	const pages = Math.max(1, Math.ceil(matching.length / BAN_LIMITS.perPage));
	const page = Math.min(options.page, pages);

	return {
		readable: true,
		items: matching.slice((page - 1) * BAN_LIMITS.perPage, page * BAN_LIMITS.perPage),
		total: matching.length,
		page,
		perPage: BAN_LIMITS.perPage,
		truncated: bans.size >= BAN_LIMITS.maxRead,
	};
}
