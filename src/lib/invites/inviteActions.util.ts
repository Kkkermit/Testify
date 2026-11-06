import { type Guild } from "discord.js";
import { UserFacingError } from "@core/errors";
import {
	getInviteSettings,
	recentJoins,
	saveInviteSettings,
	type StoredInviteJoin,
	topInviters,
} from "@database/repositories/inviteRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { canReadInvites, primeInvites } from "@lib/invites/inviteTracker.util";
import {
	INVITE_LIMITS,
	type InviteJoin,
	type InviteOverview,
	type InviteSettings,
	type InviteSettingsPatch,
} from "@testify/shared";

export async function readInviteSettings(guild: Guild): Promise<InviteSettings> {
	const stored = await getInviteSettings(guild.id);
	const logChannelId = stored?.logChannelId ?? null;

	return {
		enabled: stored?.enabled ?? false,
		logChannelId,
		canRead: canReadInvites(guild),
		canSend: logChannelId !== null && canPostIn(guild, logChannelId),
	};
}

/** Turning it on reads the server's invites straight away, so the very next join can be told apart. */
export async function applyInviteSettings(
	guild: Guild,
	patch: InviteSettingsPatch,
	updatedBy: string | null,
): Promise<InviteSettings> {
	if (patch.enabled === true && !canReadInvites(guild)) {
		throw new UserFacingError("I need the Manage Server permission to see which invite each member used.");
	}
	if (patch.logChannelId !== undefined && patch.logChannelId !== null && !canPostIn(guild, patch.logChannelId)) {
		throw new UserFacingError("I cannot post in that channel. Pick one I can send messages to.");
	}

	await saveInviteSettings(
		guild.id,
		{
			...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
			...(patch.logChannelId === undefined ? {} : { logChannelId: patch.logChannelId }),
		},
		updatedBy,
	);
	if (patch.enabled === true) await primeInvites(guild);
	return readInviteSettings(guild);
}

export function toInviteJoin(join: StoredInviteJoin): InviteJoin {
	return {
		memberId: join.memberId,
		memberName: join.memberName,
		inviterId: join.inviterId,
		inviterName: join.inviterName,
		code: join.code,
		vanity: join.vanity,
		joinedAt: join.joinedAt.toISOString(),
		leftAt: join.leftAt?.toISOString() ?? null,
	};
}

export async function readInviteOverview(guild: Guild): Promise<InviteOverview> {
	const [settings, top, recent] = await Promise.all([
		readInviteSettings(guild),
		topInviters(guild.id, INVITE_LIMITS.top),
		recentJoins(guild.id, INVITE_LIMITS.recent),
	]);

	return {
		settings,
		top: top.map((standing) => ({
			userId: standing.inviterId,
			name: standing.inviterName,
			joins: standing.joins,
			left: standing.left,
		})),
		recent: recent.map(toInviteJoin),
	};
}
