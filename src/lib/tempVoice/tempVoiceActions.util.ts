import {
	ChannelType,
	DiscordAPIError,
	type Guild,
	type GuildMember,
	PermissionFlagsBits,
	RESTJSONErrorCodes,
	type VoiceState,
} from "discord.js";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import {
	countTempChannels,
	findOwnedTempChannel,
	findTempChannel,
	forgetTempChannel,
	getTempVoiceSettings,
	listTempChannels,
	recordTempChannel,
	saveTempVoiceSettings,
	type StoredTempVoiceSettings,
} from "@database/repositories/tempVoiceRepository";
import { MAKE_PAUSE_MS, SWEEP_BATCH } from "@lib/tempVoice/tempVoice.constants";
import {
	TEMP_VOICE_LIMITS,
	TEMP_VOICE_LOBBY_NAME,
	tempChannelName,
	type TempVoicePatch,
	type TempVoiceSettings,
} from "@testify/shared";

const NEEDED = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers];

function botCanManage(guild: Guild): boolean {
	return guild.members.me?.permissions.has(NEEDED) === true;
}

export async function readTempVoiceSettings(guild: Guild): Promise<TempVoiceSettings> {
	const [stored, active] = await Promise.all([getTempVoiceSettings(guild.id), countTempChannels(guild.id)]);

	return {
		enabled: stored?.enabled ?? false,
		lobbyChannelId: stored?.lobbyChannelId ?? null,
		categoryId: stored?.categoryId ?? null,
		nameTemplate: stored?.nameTemplate ?? TEMP_VOICE_LIMITS.defaultTemplate,
		userLimit: stored?.userLimit ?? 0,
		canManage: botCanManage(guild),
		active,
	};
}

/** Nothing can be made with no lobby, so clearing it turns the feature off; each channel is checked as it is chosen. */
export async function applyTempVoiceSettings(
	guild: Guild,
	patch: TempVoicePatch,
	updatedBy: string | null,
): Promise<TempVoiceSettings> {
	const current = await readTempVoiceSettings(guild);
	const lobbyChannelId = patch.lobbyChannelId === undefined ? current.lobbyChannelId : patch.lobbyChannelId;

	if (patch.enabled === true && lobbyChannelId === null) {
		throw new UserFacingError("Pick or make a lobby before turning this on.");
	}
	if (
		patch.lobbyChannelId !== undefined &&
		patch.lobbyChannelId !== null &&
		guild.channels.cache.get(patch.lobbyChannelId)?.type !== ChannelType.GuildVoice
	) {
		throw new UserFacingError("The lobby has to be a voice channel in this server.");
	}
	if (
		patch.categoryId !== undefined &&
		patch.categoryId !== null &&
		guild.channels.cache.get(patch.categoryId)?.type !== ChannelType.GuildCategory
	) {
		throw new UserFacingError("Pick a category in this server for the new channels.");
	}

	await saveTempVoiceSettings(
		guild.id,
		{
			enabled: lobbyChannelId === null ? false : (patch.enabled ?? current.enabled),
			lobbyChannelId,
			categoryId: patch.categoryId === undefined ? current.categoryId : patch.categoryId,
			nameTemplate: patch.nameTemplate ?? current.nameTemplate,
			userLimit: patch.userLimit ?? current.userLimit,
		},
		updatedBy,
	);
	return readTempVoiceSettings(guild);
}

/** Typed into the panel's forms, and refused in words rather than clamped behind the reader's back. */
export function parseNameTemplate(input: string): string {
	const value = input.trim();
	if (value === "" || value.length > TEMP_VOICE_LIMITS.maxTemplate) {
		throw new UserFacingError(`Keep the name between 1 and ${String(TEMP_VOICE_LIMITS.maxTemplate)} characters.`);
	}
	return value;
}

export function parseUserLimit(input: string): number {
	const trimmed = input.trim();
	const value = trimmed === "" ? 0 : Number(trimmed);
	if (!Number.isInteger(value) || value < 0 || value > TEMP_VOICE_LIMITS.maxUserLimit) {
		throw new UserFacingError(
			`Pick a whole number from 0 to ${String(TEMP_VOICE_LIMITS.maxUserLimit)}, where 0 means no limit.`,
		);
	}
	return value;
}

/** Makes a voice channel to be the lobby, in the category new channels go to, and makes it the lobby. */
export async function makeLobby(guild: Guild, updatedBy: string | null): Promise<TempVoiceSettings> {
	if (!botCanManage(guild)) throw new UserFacingError("I need Manage Channels and Move Members to make a lobby.");
	const current = await readTempVoiceSettings(guild);

	const lobby = await guild.channels
		.create({
			name: TEMP_VOICE_LOBBY_NAME,
			type: ChannelType.GuildVoice,
			...(current.categoryId === null ? {} : { parent: current.categoryId }),
			reason: "Join-to-create lobby made from the settings",
		})
		.catch((error: unknown) => {
			if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.MissingPermissions) {
				throw new UserFacingError("Discord would not let me make a channel there. Check my permissions.");
			}
			throw error;
		});

	return applyTempVoiceSettings(guild, { lobbyChannelId: lobby.id }, updatedBy);
}

/** When somebody last had a channel made, per server, so the lobby cannot be used to flood a server with channels. */
const lastMade = new Map<string, number>();

function tooSoon(guildId: string, userId: string, now: number): boolean {
	const key = `${guildId}:${userId}`;
	const last = lastMade.get(key);
	if (last !== undefined && now - last < MAKE_PAUSE_MS) return true;

	if (lastMade.size > 1_000) {
		for (const [entry, at] of lastMade) if (now - at >= MAKE_PAUSE_MS) lastMade.delete(entry);
	}
	lastMade.set(key, now);
	return false;
}

/** Deleting a channel that is already gone is not a failure. */
async function deleteChannel(guild: Guild, channelId: string, reason: string): Promise<void> {
	const channel = guild.channels.cache.get(channelId);
	await channel?.delete(reason).catch((error: unknown) => {
		if (!(error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.UnknownChannel)) throw error;
	});
	await forgetTempChannel(guild.id, channelId);
}

async function openTempChannel(
	client: TestifyClient,
	guild: Guild,
	member: GuildMember,
	settings: StoredTempVoiceSettings,
	now: number,
): Promise<void> {
	const owned = await findOwnedTempChannel(guild.id, member.id);
	if (owned !== null) {
		const existing = guild.channels.cache.get(owned.channelId);
		if (existing?.isVoiceBased() === true) {
			await member.voice.setChannel(existing).catch(() => undefined);
			return;
		}
		await forgetTempChannel(guild.id, owned.channelId);
	}

	if (tooSoon(guild.id, member.id, now)) return;
	if (!botCanManage(guild)) {
		client.logger.debug(
			{ guildId: guild.id },
			"[TEMP_VOICE] Somebody joined the lobby, but I lack the permissions to make a channel.",
		);
		return;
	}

	const lobby = settings.lobbyChannelId === null ? undefined : guild.channels.cache.get(settings.lobbyChannelId);
	const parentId = settings.categoryId ?? lobby?.parentId ?? null;

	// No overwrites are given, so the channel takes its category's; the owner's own is added after.
	const channel = await guild.channels.create({
		name: tempChannelName(settings.nameTemplate, member.displayName),
		type: ChannelType.GuildVoice,
		...(parentId === null ? {} : { parent: parentId }),
		...(settings.userLimit > 0 ? { userLimit: settings.userLimit } : {}),
		reason: `Join-to-create channel for ${member.user.username}`,
	});
	await recordTempChannel({ guildId: guild.id, channelId: channel.id, ownerId: member.id });

	// Editing overwrites needs Manage Roles; without it the channel is still made, just without these rights.
	await channel.permissionOverwrites.create(member.id, { ManageChannels: true }).catch(() => undefined);

	const moved = await member.voice
		.setChannel(channel)
		.then(() => true)
		.catch(() => false);
	// They left the lobby before the channel was ready, so it would sit empty.
	if (!moved) await deleteChannel(guild, channel.id, "Its owner left before it was ready");
}

/** Only a channel the bot made, and only once nobody is left in it. */
async function closeIfEmpty(guild: Guild, channelId: string): Promise<void> {
	const channel = guild.channels.cache.get(channelId);
	if (channel !== undefined && (!channel.isVoiceBased() || channel.members.size > 0)) return;
	if ((await findTempChannel(guild.id, channelId)) === null) return;

	await deleteChannel(guild, channelId, "Its last member left");
}

export async function handleVoiceChange(
	client: TestifyClient,
	before: VoiceState,
	after: VoiceState,
	now: number = Date.now(),
): Promise<void> {
	const guild = after.guild;

	if (before.channelId !== null && before.channelId !== after.channelId) await closeIfEmpty(guild, before.channelId);

	// Tidying an empty channel is safe while paused; making a new one is not.
	if (client.paused || after.channelId === null || after.channelId === before.channelId) return;
	const member = after.member;
	if (member === null || member.user.bot) return;

	const settings = await getTempVoiceSettings(guild.id);
	if (settings?.enabled !== true || settings.lobbyChannelId !== after.channelId) return;

	await openTempChannel(client, guild, member, settings, now);
}

/** Catches what a restart missed: channels that emptied while the bot was away, and records of channels gone. */
export async function sweepTempChannels(client: TestifyClient): Promise<void> {
	for (const record of await listTempChannels(SWEEP_BATCH)) {
		const guild = client.guilds.cache.get(record.guildId);
		if (guild === undefined) continue;

		await closeIfEmpty(guild, record.channelId);
	}
}
