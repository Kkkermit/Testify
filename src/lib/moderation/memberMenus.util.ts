import { type EmbedBuilder, type GuildMember, type ModalBuilder, type User } from "discord.js";
import { strings } from "@config/strings";
import { UserFacingError } from "@core/errors";
import { modalForm } from "@lib/discord/components.util";
import { parseDuration } from "@lib/format/duration.util";
import { DEFAULT_REASON, MODERATION_FORM_ID } from "@lib/moderation/moderation.constants";
import { moderationProblem, timedOutEmbed } from "@lib/moderation/moderationActions.util";
import { moderatorOf, timeoutMember } from "@lib/moderation/sanctions.util";
import { issueWarning, warnedEmbed } from "@lib/moderation/warnActions.util";

/** The right-click Warn and Time out: a form first, then exactly what `/warn create` and `/mute` do. */

const REASON_LENGTH = 500;

export function warnForm(target: User, ownerId: string): ModalBuilder {
	return modalForm({
		id: MODERATION_FORM_ID,
		action: "warn",
		args: [target.id, ownerId],
		title: `Warn ${target.username}`,
		fields: [{ id: "reason", label: "Why they are being warned", paragraph: true, maxLength: REASON_LENGTH }],
	});
}

export function timeoutForm(target: User, ownerId: string): ModalBuilder {
	return modalForm({
		id: MODERATION_FORM_ID,
		action: "timeout",
		args: [target.id, ownerId],
		title: `Time out ${target.username}`,
		fields: [
			{ id: "duration", label: "How long", placeholder: "10m, 2h or 3d", maxLength: 20 },
			{ id: "reason", label: "Why", paragraph: true, required: false, maxLength: REASON_LENGTH },
		],
	});
}

/** Refuses before the form opens what the submit would refuse anyway: a bot, or somebody the moderator cannot act on. */
export function assertMenuTarget(
	moderator: GuildMember,
	target: User,
	member: GuildMember | null,
	botId: string,
	needsMember: boolean,
): void {
	if (target.bot) throw new UserFacingError("Bots cannot be warned or timed out.");
	if (member === null) {
		if (needsMember) throw new UserFacingError(strings.moderation.memberNotFound);
		return;
	}

	const problem = moderationProblem(moderator, member, botId);
	if (problem !== null) throw new UserFacingError(problem);
}

export async function warnFromMenu(moderator: GuildMember, target: User, reason: string): Promise<EmbedBuilder> {
	if (reason === "") throw new UserFacingError("A warning needs a reason, which is sent to them.");
	const guild = moderator.guild;
	const member = await guild.members.fetch(target.id).catch(() => null);
	assertMenuTarget(moderator, target, member, guild.client.user.id, false);

	const issued = await issueWarning({
		guild,
		user: target,
		member,
		moderator: { id: moderator.id, tag: moderator.user.username },
		reason,
	});
	return warnedEmbed(target, reason, issued);
}

export async function timeoutFromMenu(
	moderator: GuildMember,
	target: User,
	duration: string,
	reason: string,
): Promise<EmbedBuilder> {
	const durationMs = parseDuration(duration);
	if (durationMs === null) {
		throw new UserFacingError("That duration is not valid. Try something like `10m`, `2h` or `3d`.");
	}

	const guild = moderator.guild;
	const member = await guild.members.fetch(target.id).catch(() => null);
	assertMenuTarget(moderator, target, member, guild.client.user.id, true);
	if (member === null) throw new UserFacingError(strings.moderation.memberNotFound);

	const given = reason === "" ? DEFAULT_REASON : reason;
	const { notified } = await timeoutMember(guild, member, moderatorOf(moderator.user), durationMs, given);
	return timedOutEmbed({ guild, target, moderator: moderator.user, reason: given, durationMs, notified });
}
