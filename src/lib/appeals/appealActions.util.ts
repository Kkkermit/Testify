import { type Guild, PermissionFlagsBits } from "discord.js";
import { MINUTE_MS } from "@config/constants";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	appealGuildIds,
	countOpenAppeals,
	createAppeal,
	decideAppeal,
	deleteAppeal,
	getAppealSettings,
	latestAppeal,
	reopenAppeal,
	saveAppealSettings,
	setAppealMessage,
	type StoredAppeal,
	userAppeals,
} from "@database/repositories/appealRepository";
import { takesAppeals } from "@lib/appeals/appealLink.util";
import { appealDecisionText, appealPost } from "@lib/appeals/appealPanel.util";
import { canPostIn } from "@lib/discord/channels.util";
import { moderatorOf, unbanUser } from "@lib/moderation/sanctions.util";
import { TimedCache } from "@lib/site/github.util";
import {
	appealAgainAt,
	type AppealableServer,
	type AppealDecision,
	type AppealRow,
	type AppealSettings,
	type AppealSettingsPatch,
	cooldownOf,
	type OwnAppeal,
	type OwnAppeals,
} from "@testify/shared";

/** Banned members appealing on the dashboard, and staff deciding from Discord or the dashboard. */

/** The post quotes what a banned person wrote, and that can mention anybody, so nothing it sends may ping. */
const SILENT = { allowedMentions: { parse: [] } };

export async function readAppealSettings(client: TestifyClient, guild: Guild): Promise<AppealSettings> {
	const [stored, open] = await Promise.all([getAppealSettings(guild.id), countOpenAppeals(guild.id)]);
	const channelId = stored?.channelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		channelId,
		canSend: channelId !== null && canPostIn(guild, channelId),
		cooldownDays: cooldownOf(stored?.cooldownDays),
		dashboard: takesAppeals(client),
		open,
	};
}

/** Appeals cannot be on with nowhere to show them, or with no dashboard to write them on. */
export async function applyAppealSettings(
	client: TestifyClient,
	guild: Guild,
	patch: AppealSettingsPatch,
	updatedBy: string | null,
): Promise<AppealSettings> {
	const current = await readAppealSettings(client, guild);
	const channelId = patch.channelId === undefined ? current.channelId : patch.channelId;
	const enabled = patch.enabled ?? current.enabled;

	if (patch.enabled === true && !current.dashboard) {
		throw new UserFacingError("Appeals are written on the web dashboard, and this bot does not run one.");
	}
	if (patch.enabled === true && channelId === null) {
		throw new UserFacingError("Pick a channel for appeals before turning them on.");
	}
	if (patch.channelId !== undefined && patch.channelId !== null && !canPostIn(guild, patch.channelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}

	await saveAppealSettings(
		guild.id,
		{
			enabled: channelId === null ? false : enabled,
			channelId,
			...(patch.cooldownDays === undefined ? {} : { cooldownDays: patch.cooldownDays }),
		},
		updatedBy,
	);
	return readAppealSettings(client, guild);
}

function ownAppeal(appeal: StoredAppeal): OwnAppeal {
	return {
		id: appeal.id,
		guildId: appeal.guildId,
		status: appeal.status,
		text: appeal.text,
		reason: appeal.reason,
		createdAt: appeal.createdAt.toISOString(),
		decidedAt: appeal.decidedAt?.toISOString() ?? null,
	};
}

/** Discord answers a missing ban with an error, and a ban the bot may not read is treated the same as none. */
async function isBanned(guild: Guild, userId: string): Promise<boolean> {
	if (guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers) !== true) return false;

	return guild.bans.fetch({ user: userId, force: true }).then(
		() => true,
		() => false,
	);
}

/** The listing's answers, kept a minute so reloading it is not a request to Discord for every server each time. */
const listedBans = new TimedCache<boolean>(MINUTE_MS, 10_000);

export function clearListedBans(): void {
	listedBans.clear();
}

/** The appeal still waiting here, and when a refused one allows the next. */
async function appealBlock(
	guild: Guild,
	userId: string,
	cooldownDays: number,
): Promise<{ open: StoredAppeal | null; againAt: Date | null }> {
	const latest = await latestAppeal(guild.id, userId);
	const open = latest?.status === "open" ? latest : null;
	const refusedAt = latest?.status === "refused" ? latest.decidedAt : null;

	return { open, againAt: appealAgainAt(refusedAt, cooldownOf(cooldownDays)) };
}

/** Every server that has banned the reader and takes appeals, and every appeal they have sent. */
export async function readOwnAppeals(client: TestifyClient, userId: string): Promise<OwnAppeals> {
	const guildIds = await appealGuildIds();
	const guilds = guildIds.flatMap((id) => {
		const guild = client.guilds.cache.get(id);
		return guild === undefined ? [] : [guild];
	});

	const servers = await Promise.all(
		guilds.map(async (guild): Promise<AppealableServer | null> => {
			if (!(await listedBans.get(`${guild.id}:${userId}`, () => isBanned(guild, userId)))) return null;

			const settings = await getAppealSettings(guild.id);
			const { open, againAt } = await appealBlock(guild, userId, settings?.cooldownDays ?? 0);
			return {
				guildId: guild.id,
				name: guild.name,
				iconUrl: guild.iconURL({ size: 64 }),
				open: open === null ? null : ownAppeal(open),
				againAt: againAt?.toISOString() ?? null,
			};
		}),
	);

	const sent = await userAppeals(userId);
	return {
		servers: servers.filter((server) => server !== null),
		appeals: sent.map((appeal) => ({
			...ownAppeal(appeal),
			guildName: client.guilds.cache.get(appeal.guildId)?.name ?? null,
		})),
	};
}

export async function submitAppeal(
	client: TestifyClient,
	guildId: string,
	user: { id: string; username: string },
	text: string,
): Promise<OwnAppeal> {
	const guild = client.guilds.cache.get(guildId);
	const settings = guild === undefined ? null : await getAppealSettings(guild.id);
	if (guild === undefined || settings?.enabled !== true || settings.channelId === null || !takesAppeals(client)) {
		throw new UserFacingError("That server does not take appeals.");
	}
	if (!(await isBanned(guild, user.id))) throw new UserFacingError("You are not banned from that server.");

	const { open, againAt } = await appealBlock(guild, user.id, settings.cooldownDays);
	if (open !== null) throw new UserFacingError("Your appeal to that server is still waiting for a decision.");
	if (againAt !== null) {
		throw new UserFacingError("Your last appeal was refused. You can appeal again once the server's wait is over.");
	}

	const channel = await guild.channels.fetch(settings.channelId).catch(() => null);
	if (channel?.isSendable() !== true) {
		throw new UserFacingError("That server cannot take appeals right now. Try again later.");
	}

	const appeal = await createAppeal({ guildId: guild.id, userId: user.id, username: user.username, text });
	if (appeal === null) throw new UserFacingError("Your appeal to that server is still waiting for a decision.");

	try {
		const sent = await channel.send({ ...appealPost(appeal), ...SILENT });
		await setAppealMessage(guild.id, appeal.id, { channelId: channel.id, messageId: sent.id });
		return ownAppeal(appeal);
	} catch (error) {
		// An appeal staff cannot see would wait for ever, so the record goes with the post that failed.
		await deleteAppeal(guild.id, appeal.id);
		throw error;
	}
}

async function refreshAppealPost(guild: Guild, appeal: StoredAppeal): Promise<void> {
	if (appeal.channelId === null || appeal.messageId === null) return;

	const channel = await guild.channels.fetch(appeal.channelId).catch(() => null);
	if (channel?.isTextBased() !== true) return;

	const message = await channel.messages.fetch(appeal.messageId).catch(() => null);
	await message?.edit({ ...appealPost(appeal), ...SILENT });
}

/**
 * The decision is claimed before the unban, so two staff pressing at once cannot both act; an unban Discord refuses
 * hands the appeal back, and a ban lifted some other way meanwhile still counts as accepted.
 */
export async function decideOnAppeal(
	client: TestifyClient,
	guild: Guild,
	appealId: string,
	decision: AppealDecision,
	by: { id: string; username: string },
): Promise<StoredAppeal> {
	const decided = await decideAppeal(guild.id, appealId, {
		...decision,
		by: by.id,
		byName: by.username,
		at: new Date(),
	});
	if (decided === null) throw new UserFacingError("That appeal has already been decided.");

	if (decided.status === "accepted" && (await isBanned(guild, decided.userId))) {
		try {
			await unbanUser(guild, decided.userId, moderatorOf(by), decision.reason || "Appeal accepted");
		} catch (error) {
			await reopenAppeal(guild.id, appealId);
			throw new UserFacingError(
				error instanceof UserFacingError ? error.message : "Discord refused the unban. Check that I have Ban Members.",
			);
		}
	}

	await refreshAppealPost(guild, decided);
	await client.users
		.fetch(decided.userId)
		.then((user) => user.send({ content: appealDecisionText(decided, guild.name), ...SILENT }))
		.catch(() => {
			client.logger.debug({ guildId: guild.id }, "[APPEALS] Could not tell the person what was decided.");
		});

	return decided;
}

export function appealLinkOf(appeal: Pick<StoredAppeal, "guildId" | "channelId" | "messageId">): string | null {
	return appeal.channelId === null || appeal.messageId === null
		? null
		: `https://discord.com/channels/${appeal.guildId}/${appeal.channelId}/${appeal.messageId}`;
}

export function toAppealRow(appeal: StoredAppeal): AppealRow {
	return {
		id: appeal.id,
		userId: appeal.userId,
		username: appeal.username,
		text: appeal.text,
		status: appeal.status,
		reason: appeal.reason,
		decidedByName: appeal.decidedByName,
		decidedAt: appeal.decidedAt?.toISOString() ?? null,
		createdAt: appeal.createdAt.toISOString(),
		messageUrl: appealLinkOf(appeal),
	};
}
