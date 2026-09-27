import { type Guild } from "discord.js";
import { DAY_MS, WEEK_MS } from "@config/constants";
import { type MemberCounts } from "@testify/shared";

interface Counted {
	bot: boolean;
	joinedTimestamp: number | null;
}

/** People are the total less the bots, because the total is Discord's own count and the cache may not hold everyone. */
export function countMembers(total: number, members: Iterable<Counted>, now: number): MemberCounts {
	let bots = 0;
	let joinedDay = 0;
	let joinedWeek = 0;

	for (const member of members) {
		if (member.bot) bots += 1;
		if (member.joinedTimestamp === null) continue;

		const since = now - member.joinedTimestamp;
		if (since < DAY_MS) joinedDay += 1;
		if (since < WEEK_MS) joinedWeek += 1;
	}

	return { total, people: Math.max(0, total - bots), bots, joinedDay, joinedWeek };
}

/** Fetches the member list first; without the members intent the cache is partial and the counts are a floor. */
export async function readMemberCounts(guild: Guild, now = Date.now()): Promise<MemberCounts> {
	await guild.members.fetch().catch(() => null);

	const members = [...guild.members.cache.values()].map((member) => ({
		bot: member.user.bot,
		joinedTimestamp: member.joinedTimestamp,
	}));

	return countMembers(guild.memberCount, members, now);
}
