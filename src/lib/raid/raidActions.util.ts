import { type Guild, type GuildMember, type MessageCreateOptions, PermissionFlagsBits } from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { toError, UserFacingError } from "@core/errors";
import { getRaidSettings, type RaidSettingsOnDisk, saveRaidSettings } from "@database/repositories/raidRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { embed } from "@lib/discord/embeds.util";
import { discordTime, formatDurationLong } from "@lib/format/format.util";
import { holdUntil, joinWatch, type JoinWatch, type Spike, type WatchedJoin } from "@lib/raid/raid.util";
import { accountAgeMinutes, DEFAULT_RAID, type RaidOverview, type RaidPatch, type RaidSettings } from "@testify/shared";

/** A server's raid protection: its settings, the hold on a young account, and what staff are told. */

/** A record written before minutes keeps its age in days, which is read here and nowhere else. */
export function ageOnDisk(stored: RaidSettingsOnDisk | null): number {
	if (stored?.minAccountAgeMinutes !== undefined) return stored.minAccountAgeMinutes;
	if (stored?.minAccountAgeDays !== undefined) return stored.minAccountAgeDays * 1_440;
	return DEFAULT_RAID.minAccountAgeMinutes;
}

export function normaliseRaid(stored: RaidSettingsOnDisk | null): RaidSettings {
	return {
		enabled: stored?.enabled ?? DEFAULT_RAID.enabled,
		alertChannelId: stored?.alertChannelId ?? null,
		pingRoleId: stored?.pingRoleId ?? null,
		minAccountAgeMinutes: ageOnDisk(stored),
		spikeJoins: stored?.spikeJoins ?? DEFAULT_RAID.spikeJoins,
		spikeMinutes: stored?.spikeMinutes ?? DEFAULT_RAID.spikeMinutes,
	};
}

/** Raid protection with neither a minimum age nor an alert channel would be on and do nothing. */
export function hasWork(settings: Pick<RaidSettings, "minAccountAgeMinutes" | "alertChannelId">): boolean {
	return settings.minAccountAgeMinutes > 0 || settings.alertChannelId !== null;
}

export function overviewOf(guild: Guild, settings: RaidSettings): RaidOverview {
	const me = guild.members.me;
	const role = settings.pingRoleId === null ? null : guild.roles.cache.get(settings.pingRoleId);

	return {
		...settings,
		canSend: settings.alertChannelId !== null && canPostIn(guild, settings.alertChannelId),
		canHold: me?.permissions.has(PermissionFlagsBits.ModerateMembers) === true,
		canPing:
			settings.pingRoleId === null ||
			role?.mentionable === true ||
			me?.permissions.has(PermissionFlagsBits.MentionEveryone) === true,
	};
}

export async function readRaidOverview(guild: Guild): Promise<RaidOverview> {
	return overviewOf(guild, normaliseRaid(await getRaidSettings(guild.id)));
}

/** A channel and a role are checked as they are chosen; taking away the last thing to do turns it off. */
export async function applyRaidSettings(
	guild: Guild,
	patch: RaidPatch,
	updatedBy: string | null,
): Promise<RaidOverview> {
	const current = normaliseRaid(await getRaidSettings(guild.id));
	const next: RaidSettings = {
		enabled: patch.enabled ?? current.enabled,
		alertChannelId: patch.alertChannelId === undefined ? current.alertChannelId : patch.alertChannelId,
		pingRoleId: patch.pingRoleId === undefined ? current.pingRoleId : patch.pingRoleId,
		minAccountAgeMinutes: patch.minAccountAgeMinutes ?? current.minAccountAgeMinutes,
		spikeJoins: patch.spikeJoins ?? current.spikeJoins,
		spikeMinutes: patch.spikeMinutes ?? current.spikeMinutes,
	};

	if (patch.alertChannelId !== undefined && patch.alertChannelId !== null && !canPostIn(guild, patch.alertChannelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}
	if (patch.pingRoleId !== undefined && patch.pingRoleId !== null) {
		if (patch.pingRoleId === guild.id) throw new UserFacingError("Pick a staff role rather than @everyone.");
		if (!guild.roles.cache.has(patch.pingRoleId)) throw new UserFacingError("That role is not in this server.");
	}
	if (patch.enabled === true && !hasWork(next)) {
		throw new UserFacingError("Set a minimum account age or an alert channel before turning raid protection on.");
	}

	await saveRaidSettings(guild.id, { ...next, enabled: next.enabled && hasWork(next) }, updatedBy);
	return readRaidOverview(guild);
}

type HoldOutcome =
	{ held: true; until: number } | { held: false; reason: "permission" | "outranked" | "refused" } | null;

/** A length of whole minutes, in words: "12 hours", "1 day, 6 hours", "30 minutes". */
export function ageWords(minutes: number): string {
	return minutes < 1 ? "less than a minute" : formatDurationLong(minutes * MINUTE_MS);
}

/** The note a held member is sent, since a timeout on its own does not say why. */
function heldNotice(guildName: string, minAccountAgeMinutes: number, until: number): string {
	return [
		`**${guildName}** holds back accounts newer than ${ageWords(minAccountAgeMinutes)}, so you can read there but not talk until ${discordTime(until)} (${discordTime(until, "R")}).`,
		"It lifts on its own, and nothing else is needed. A moderator can lift it sooner.",
	].join("\n");
}

/** Times out an account younger than the server's minimum until it is old enough; null when nothing applies. */
export async function holdNewAccount(
	member: GuildMember,
	settings: Pick<RaidSettings, "minAccountAgeMinutes">,
	now: number = Date.now(),
): Promise<HoldOutcome> {
	if (member.user.bot) return null;

	const until = holdUntil(member.user.createdTimestamp, settings.minAccountAgeMinutes, now);
	if (until === null) return null;

	if (member.guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers) !== true) {
		return { held: false, reason: "permission" };
	}
	if (!member.moderatable) return { held: false, reason: "outranked" };

	const age = accountAgeMinutes(member.user.createdTimestamp, now);
	const reason = `Raid protection: the account is ${ageWords(age)} old, and this server asks for ${ageWords(settings.minAccountAgeMinutes)}.`;
	const held = await member.timeout(until - now, reason).then(
		() => true,
		() => false,
	);
	if (!held) return { held: false, reason: "refused" };

	await member.send(heldNotice(member.guild.name, settings.minAccountAgeMinutes, until)).catch(() => undefined);
	return { held: true, until };
}

const WHY_NOT: Record<Exclude<HoldOutcome, null | { held: true }>["reason"], string> = {
	permission: "I need the Moderate Members permission to hold anybody back.",
	outranked: "Their highest role is at or above mine, so I cannot time them out.",
	refused: "Discord refused the timeout.",
};

function joinLine(join: WatchedJoin, now: number): string {
	const mark = join.held === true ? " · **held**" : join.held === false ? " · too new, not held" : "";
	return `<@${join.userId}> · ${join.username} · account ${ageWords(accountAgeMinutes(join.createdAt, now))} old${mark}`;
}

/** One young account, told to staff when no spike is already being reported. */
function holdPost(member: GuildMember, outcome: Exclude<HoldOutcome, null>, now: number): MessageCreateOptions {
	const age = ageWords(accountAgeMinutes(member.user.createdTimestamp, now));

	return {
		embeds: [
			embed({
				category: "moderation",
				title: outcome.held ? "🛡️ Held back a new account" : "⚠️ A new account was not held back",
				description: outcome.held
					? `${member} (\`${member.id}\`) joined with an account ${age} old, so they cannot talk until ${discordTime(outcome.until)} (${discordTime(outcome.until, "R")}). Lift it sooner with \`/unmute\`.`
					: `${member} (\`${member.id}\`) joined with an account ${age} old. ${WHY_NOT[outcome.reason]}`,
				thumbnail: member.user.displayAvatarURL(),
			}),
		],
		allowedMentions: { parse: [] },
	};
}

/** The only post that pings anybody, and only the role a manager chose for it. */
export function spikePost(spike: Spike, settings: Pick<RaidSettings, "pingRoleId">, now: number): MessageCreateOptions {
	const lines = spike.newest.map((join) => joinLine(join, now));
	const more = spike.joins - spike.newest.length;
	if (more > 0) lines.push(`…and ${String(more)} more.`);

	const minutes = spike.minutes === 1 ? "minute" : `${String(spike.minutes)} minutes`;
	const held =
		spike.held === 0
			? ""
			: `\n${String(spike.held)} of them ${spike.held === 1 ? "was" : "were"} held back as new accounts.`;

	return {
		...(settings.pingRoleId === null ? {} : { content: `<@&${settings.pingRoleId}>` }),
		embeds: [
			embed({
				category: "moderation",
				title: "🚨 Joins are spiking",
				description: `**${String(spike.joins)}** members joined in the last ${minutes}.${held}\n\n${lines.join("\n")}`,
				fields: [
					{
						name: "If this is a raid",
						value:
							"Pause invites or raise the verification level under **Server Settings → Safety Setup**, or set a minimum account age with `/raid-protection`. Nobody has been kicked or banned.",
					},
				],
			}),
		],
		allowedMentions: settings.pingRoleId === null ? { parse: [] } : { roles: [settings.pingRoleId] },
	};
}

async function postAlert(client: TestifyClient, guild: Guild, channelId: string, message: MessageCreateOptions) {
	const channel = await guild.channels.fetch(channelId).catch(() => null);
	if (channel?.isSendable() !== true) return;

	await channel.send(message).catch((error: unknown) => {
		client.logger.warn({ err: toError(error), guildId: guild.id }, "[RAID] Could not post a raid alert");
	});
}

/** A join under raid protection: hold a young account, then tell staff about the hold or about a spike. */
export async function guardJoin(
	client: TestifyClient,
	member: GuildMember,
	watch: JoinWatch = joinWatch,
	now: number = Date.now(),
): Promise<void> {
	if (member.user.bot) return;

	try {
		const settings = normaliseRaid(await getRaidSettings(member.guild.id));
		if (!settings.enabled) return;

		const outcome = await holdNewAccount(member, settings, now);
		const spike = watch.record(
			member.guild.id,
			{
				userId: member.id,
				username: member.user.username,
				createdAt: member.user.createdTimestamp,
				at: now,
				...(outcome === null ? {} : { held: outcome.held }),
			},
			settings,
		);

		if (settings.alertChannelId === null) return;
		const message =
			spike !== null
				? spikePost(spike, settings, now)
				: outcome !== null && !watch.alerting(member.guild.id, now)
					? holdPost(member, outcome, now)
					: null;

		if (message !== null) await postAlert(client, member.guild, settings.alertChannelId, message);
	} catch (error) {
		client.logger.warn({ err: toError(error), guildId: member.guild.id }, "[RAID] Could not check a join");
	}
}
