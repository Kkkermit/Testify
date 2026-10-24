import {
	ChannelType,
	DiscordAPIError,
	type Guild,
	type GuildMember,
	type OverwriteResolvable,
	PermissionFlagsBits,
	RESTJSONErrorCodes,
	type TextChannel,
} from "discord.js";
import { UserFacingError } from "@core/errors";
import { getLevelSettings, saveLevelSettings } from "@database/repositories/levelRepository";
import {
	getAuditLogConfig,
	getWelcome,
	saveWelcome,
	setAuditLogConfig,
} from "@database/repositories/settingsRepository";
import { canPostInChannel } from "@lib/discord/channels.util";
import { normaliseSettings } from "@lib/levelling/levelling.util";
import {
	AUDIT_EVENTS,
	AUDIT_LOG_CHANNEL_NAME,
	collapseEnabled,
	DEFAULT_WELCOME_MESSAGE,
	type SetupChecklist,
	type SetupStep,
	type SetupStepState,
} from "@testify/shared";

/** Who pressed the button: a bot owner may not be a member, and is held to nothing a member is. */
export interface SetupActor {
	member: GuildMember | undefined;
	isOwner: boolean;
}

const WELCOME_NAMES = [/welcome/i, /general/i, /lobby/i, /chat/i];
const LOG_NAME = /log|audit/i;

/** Text channels the bot can post in and the person could post in themselves, in the server's own order. */
function postable(guild: Guild, actor: SetupActor): TextChannel[] {
	return [...guild.channels.cache.values()]
		.filter((channel): channel is TextChannel => channel.type === ChannelType.GuildText)
		.filter((channel) => canPostInChannel(guild, channel))
		.filter(
			(channel) =>
				actor.isOwner ||
				(actor.member
					?.permissionsIn(channel)
					.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]) ??
					false),
		)
		.sort((a, b) => a.rawPosition - b.rawPosition);
}

/** Discord's own join-message channel first, then one whose name says it is for greeting, then the first there is. */
export function welcomeChannel(guild: Guild, actor: SetupActor): TextChannel | null {
	const candidates = postable(guild, actor);
	const system = candidates.find((channel) => channel.id === guild.systemChannelId);
	if (system !== undefined) return system;

	for (const name of WELCOME_NAMES) {
		const named = candidates.find((channel) => name.test(channel.name));
		if (named !== undefined) return named;
	}

	return candidates[0] ?? null;
}

/** A log holds deleted messages, so only a channel @everyone cannot see is ever reused for one. */
export function privateLogChannel(guild: Guild, actor: SetupActor): TextChannel | null {
	return (
		postable(guild, actor).find(
			(channel) =>
				LOG_NAME.test(channel.name) &&
				!channel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel),
		) ?? null
	);
}

function canCreate(guild: Guild, actor: SetupActor): "bot_cannot_create" | "you_cannot_create" | null {
	if (guild.members.me?.permissions.has(PermissionFlagsBits.ManageChannels) !== true) return "bot_cannot_create";
	if (!actor.isOwner && actor.member?.permissions.has(PermissionFlagsBits.ManageChannels) !== true) {
		return "you_cannot_create";
	}
	return null;
}

function state(step: SetupStep, done: boolean, rest: Partial<SetupStepState> = {}): SetupStepState {
	return { step, done, channelId: null, channelName: null, createsChannel: false, blocker: null, ...rest };
}

export async function readSetupChecklist(guild: Guild, actor: SetupActor): Promise<SetupChecklist> {
	const [levels, welcome, audit] = await Promise.all([
		getLevelSettings(guild.id),
		getWelcome(guild.id),
		getAuditLogConfig(guild.id),
	]);

	const greeting = welcomeChannel(guild, actor);
	const reused = privateLogChannel(guild, actor);
	const blocked = reused === null ? canCreate(guild, actor) : null;

	return {
		steps: [
			state("levelling", normaliseSettings(levels).enabled),
			state("welcome", (welcome?.channelId ?? null) !== null, {
				channelId: greeting?.id ?? null,
				channelName: greeting?.name ?? null,
				blocker: greeting === null ? "no_channel" : null,
			}),
			state("audit-log", audit !== null && audit.enabledLogs.length > 0, {
				channelId: reused?.id ?? null,
				channelName: reused?.name ?? AUDIT_LOG_CHANNEL_NAME,
				createsChannel: reused === null,
				blocker: blocked,
			}),
		],
	};
}

const BLOCKED: Record<"no_channel" | "bot_cannot_create" | "you_cannot_create", string> = {
	no_channel: "There is no channel both of us can post in. Pick one on the feature's own screen.",
	bot_cannot_create: "I need the Manage Channels permission to make a private log channel. Pick one instead.",
	you_cannot_create: "Making a channel needs the Manage Channels permission. Pick an existing channel instead.",
};

/** The channel is private to the bot, the person who asked, and the administrators Discord always lets through. */
async function createLogChannel(guild: Guild, actor: SetupActor): Promise<TextChannel> {
	const me = guild.members.me;
	if (me === null) throw new UserFacingError("I am not fully connected to this server yet. Try again in a moment.");

	const overwrites: OverwriteResolvable[] = [
		{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
		{
			id: me.id,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.EmbedLinks,
				PermissionFlagsBits.AttachFiles,
			],
		},
	];
	if (actor.member !== undefined) {
		overwrites.push({ id: actor.member.id, allow: [PermissionFlagsBits.ViewChannel] });
	}

	try {
		return await guild.channels.create({
			name: AUDIT_LOG_CHANNEL_NAME,
			type: ChannelType.GuildText,
			permissionOverwrites: overwrites,
			reason: "Audit log set up from the dashboard",
		});
	} catch (error) {
		if (error instanceof DiscordAPIError && error.code === RESTJSONErrorCodes.MissingPermissions) {
			throw new UserFacingError(BLOCKED.bot_cannot_create);
		}
		throw error;
	}
}

/** Turns one feature on with the defaults the checklist showed; a step already done is left exactly as it is. */
export async function runSetupStep(
	guild: Guild,
	actor: SetupActor,
	step: SetupStep,
): Promise<{ checklist: SetupChecklist; channelId: string | null }> {
	const before = (await readSetupChecklist(guild, actor)).steps.find((candidate) => candidate.step === step);
	if (before === undefined || before.done) throw new UserFacingError("That is already set up.");
	if (before.blocker !== null) throw new UserFacingError(BLOCKED[before.blocker]);

	let channelId: string | null = null;

	if (step === "levelling") {
		await saveLevelSettings(guild.id, { isDisabled: false });
	} else if (step === "welcome") {
		channelId = before.channelId;
		if (channelId === null) throw new UserFacingError(BLOCKED.no_channel);
		await saveWelcome(guild.id, { channelId, message: DEFAULT_WELCOME_MESSAGE, style: "card" });
	} else {
		channelId = before.channelId ?? (await createLogChannel(guild, actor)).id;
		await setAuditLogConfig(guild.id, channelId, collapseEnabled([...AUDIT_EVENTS]));
	}

	return { checklist: await readSetupChecklist(guild, actor), channelId };
}
