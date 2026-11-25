import { type Guild, type GuildMember } from "discord.js";
import { UserFacingError } from "@core/errors";
import { type Logger } from "@core/logger";
import {
	adjustBank,
	adjustWallet,
	debitBank,
	debitWallet,
	findAccount,
	getEconomyRank,
} from "@database/repositories/economyRepository";
import { latestJoinOf } from "@database/repositories/inviteRepository";
import { addXp, getLevelSettings, getRank, getUserLevel, setLevel } from "@database/repositories/levelRepository";
import { getActiveSoftban, getWarnings } from "@database/repositories/moderationRepository";
import { problemText } from "@lib/format/problemText.util";
import { toInviteJoin } from "@lib/invites/inviteActions.util";
import { type RewardOutcome } from "@lib/levelling/levelling.types";
import { normaliseSettings } from "@lib/levelling/levelling.util";
import { applyLevelRewards } from "@lib/levelling/levellingActions.util";
import { blockText, moderationProblem } from "@lib/moderation/moderationActions.util";
import { memberWarningOf, readWarnLadder } from "@lib/moderation/warnActions.util";
import { type MemberDetail, type MoneyPurse, problem } from "@testify/shared";

/** One member's page on the dashboard: everything it shows, and the money and level changes made from it. */

/** A timeout that has run out stays on the member until Discord next says otherwise, so the time decides. */
function timedOutUntil(member: GuildMember | null, now: number = Date.now()): string | null {
	const until = member?.communicationDisabledUntilTimestamp ?? null;
	return until !== null && until > now ? new Date(until).toISOString() : null;
}

/** Everything one member's page shows, in one read; `member` is null once they leave, and every section survives it. */
export async function readMemberDetail(options: {
	guild: Guild;
	userId: string;
	member: GuildMember | null;
	moderator: GuildMember | null;
	botId: string | undefined;
}): Promise<MemberDetail> {
	const { guild, userId, member, moderator, botId } = options;

	const [account, economyRank, level, levelRank, warnings, softban, ladder, joined] = await Promise.all([
		findAccount(guild.id, userId),
		getEconomyRank(guild.id, userId),
		getUserLevel(guild.id, userId),
		getRank(guild.id, userId),
		getWarnings(guild.id, userId),
		getActiveSoftban(guild.id, userId),
		readWarnLadder(guild.id),
		latestJoinOf(guild.id, userId),
	]);

	return {
		userId,
		displayName: member?.displayName ?? warnings?.userTag ?? "Left the server",
		username: member?.user.username ?? warnings?.userTag ?? userId,
		avatarUrl: member?.displayAvatarURL({ extension: "png", size: 128 }) ?? null,
		inGuild: member !== null,
		isBot: member?.user.bot ?? false,
		joinedAt: member?.joinedAt?.toISOString() ?? null,
		nickname: member?.nickname ?? null,
		timedOutUntil: timedOutUntil(member),
		roles:
			member === null
				? []
				: [...member.roles.cache.values()]
						.filter((role) => role.id !== guild.id)
						.sort((a, b) => b.position - a.position)
						.map((role) => ({
							id: role.id,
							name: role.name,
							colour: role.hexColor === "#000000" ? null : role.hexColor,
						})),
		economy:
			account === null
				? null
				: {
						wallet: account.wallet,
						bank: account.bank,
						total: account.wallet + account.bank,
						rank: economyRank,
					},
		levels: level === null ? null : { level: level.level, xp: level.xp, rank: levelRank },
		warnings: (warnings?.warnings ?? []).map((entry) => memberWarningOf(entry, ladder.expireAfterDays)).reverse(),
		softban:
			softban === null
				? null
				: {
						reason: softban.reason,
						moderatorId: softban.moderatorId,
						expiresAt: softban.expiresAt.toISOString(),
					},
		invite: joined === null ? null : toInviteJoin(joined),
		// A member who has left cannot be acted on through Discord, and neither can one the caller sits below.
		moderationProblem:
			member === null
				? "They are no longer in this server."
				: moderator === null
					? blockText("notMember")
					: moderationProblem(moderator, member, botId),
	};
}

interface LevelChange {
	level: number;
	xp: number;
	rewards: RewardOutcome;
}

/** Sets a level or moves XP, then hands out whatever role rewards the new level earns. */
export async function changeLevel(
	guild: Guild,
	member: GuildMember,
	change: { level?: number; xp?: number },
	logger?: Logger,
): Promise<LevelChange> {
	const record =
		change.level === undefined
			? await addXp(guild.id, member.id, change.xp ?? 0)
			: await setLevel(guild.id, member.id, change.level);

	const config = normaliseSettings(await getLevelSettings(guild.id));

	return { level: record.level, xp: record.xp, rewards: await applyLevelRewards(member, config, record.level, logger) };
}

/** Money moves by `$inc`, and a take only while the balance still covers it, so no change is lost and none overdraws. */
export async function changeMoney(
	guildId: string,
	userId: string,
	purse: MoneyPurse,
	delta: number,
): Promise<{ wallet: number; bank: number }> {
	const add = purse === "wallet" ? adjustWallet : adjustBank;
	const take = purse === "wallet" ? debitWallet : debitBank;
	const account = delta >= 0 ? await add(guildId, userId, delta) : await take(guildId, userId, -delta);

	if (account === null) {
		const held = (await findAccount(guildId, userId))?.[purse] ?? 0;
		const short = problem(purse === "wallet" ? "money.walletShort" : "money.bankShort", { held });
		throw new UserFacingError(problemText(short));
	}

	return { wallet: account.wallet, bank: account.bank };
}
