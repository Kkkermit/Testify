import {
	type Guild,
	type GuildMember,
	type Message,
	type MessageCreateOptions,
	type ModalBuilder,
	PermissionFlagsBits,
} from "discord.js";
import { HOUR_MS } from "@config/constants";
import { UserFacingError } from "@core/errors";
import { linkButton, modalForm, row } from "@lib/discord/components.util";
import { embed } from "@lib/discord/embeds.util";
import { truncate } from "@lib/format/format.util";
import { REPORT_FORM_ID, REPORT_LIMITS } from "@lib/modmail/modmail.constants";
import { readModmailSettings } from "@lib/modmail/modmailActions.util";

/** Right-click Report message: a member tells the server's staff about a message, in its mod mail channel. */

/** When each person last reported, by server, and which messages; nothing here outlives a restart. */
const sent = new Map<string, { at: number; messageId: string }[]>();

const keyOf = (guildId: string, userId: string): string => `${guildId}:${userId}`;

function recent(guildId: string, userId: string, now: number): { at: number; messageId: string }[] {
	return (sent.get(keyOf(guildId, userId)) ?? []).filter((report) => now - report.at < HOUR_MS);
}

export function reportLimitProblem(
	guildId: string,
	userId: string,
	messageId: string,
	now = Date.now(),
): string | null {
	const reports = recent(guildId, userId, now);
	if (reports.some((report) => report.messageId === messageId)) return "You have reported that message already.";
	if (reports.length >= REPORT_LIMITS.perHour) {
		return `You have sent ${String(REPORT_LIMITS.perHour)} reports in the last hour. Try again later, or message a moderator.`;
	}
	return null;
}

function noteReport(guildId: string, userId: string, messageId: string, now: number): void {
	if (sent.size > REPORT_LIMITS.remembered) sent.clear();
	sent.set(keyOf(guildId, userId), [...recent(guildId, userId, now), { at: now, messageId }]);
}

export function clearReports(): void {
	sent.clear();
}

export function reportForm(message: Pick<Message, "channelId" | "id">, ownerId: string): ModalBuilder {
	return modalForm({
		id: REPORT_FORM_ID,
		action: "send",
		args: [message.channelId, message.id, ownerId],
		title: "Report a message",
		fields: [
			{
				id: "reason",
				label: "What is wrong with it",
				paragraph: true,
				maxLength: REPORT_LIMITS.reasonLength,
			},
		],
	});
}

/** Where the report would go, or why it cannot be made; asked before the form opens and again when it is sent. */
export async function reportDestination(
	guild: Guild,
	reporterId: string,
	message: Message<true>,
): Promise<{ channelId: string; pingRoleId: string | null }> {
	if (message.system) throw new UserFacingError("Discord's own messages cannot be reported here.");
	if (message.author.id === reporterId) throw new UserFacingError("You cannot report your own message.");

	const settings = await readModmailSettings(guild);
	if (!settings.enabled || settings.channelId === null || !settings.canUse) {
		throw new UserFacingError("This server has not set up mod mail, so a report has nowhere to go. Tell a moderator.");
	}

	const problem = reportLimitProblem(guild.id, reporterId, message.id);
	if (problem !== null) throw new UserFacingError(problem);
	return { channelId: settings.channelId, pingRoleId: settings.pingRoleId };
}

export function reportPost(report: {
	reporter: { id: string; username: string };
	message: Message<true>;
	reason: string;
	pingRoleId: string | null;
}): MessageCreateOptions {
	const { reporter, message } = report;
	const link = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;
	const files = message.attachments.size;
	const quote = message.content === "" ? "*No text*" : truncate(message.content, REPORT_LIMITS.quoteLength);

	return {
		...(report.pingRoleId === null ? {} : { content: `<@&${report.pingRoleId}>` }),
		embeds: [
			embed({
				category: "moderation",
				title: "🚩 Message reported",
				description: quote,
				fields: [
					{ name: "Written by", value: `<@${message.author.id}> (${message.author.username})`, inline: true },
					{ name: "Reported by", value: `<@${reporter.id}> (${reporter.username})`, inline: true },
					{ name: "Channel", value: `<#${message.channelId}>`, inline: true },
					{ name: "Sent", value: `<t:${String(Math.floor(message.createdTimestamp / 1_000))}:f>`, inline: true },
					...(files > 0 ? [{ name: "Attachments", value: String(files), inline: true }] : []),
					{ name: "What is wrong with it", value: report.reason },
				],
				footer: `Author ${message.author.id} · Message ${message.id}`,
			}),
		],
		components: [row(linkButton("Jump to message", link))],
		// The quote is somebody's own words, so only the role a manager chose is pinged.
		allowedMentions: { parse: [], roles: report.pingRoleId === null ? [] : [report.pingRoleId] },
	};
}

/** Sends a report from the form, reading the message again so what staff see is what is there now. */
export async function sendReport(
	reporter: GuildMember,
	channelId: string,
	messageId: string,
	reason: string,
): Promise<void> {
	const guild = reporter.guild;
	const channel = await guild.channels.fetch(channelId).catch(() => null);
	if (channel?.isTextBased() !== true || !channel.permissionsFor(reporter).has(PermissionFlagsBits.ViewChannel)) {
		throw new UserFacingError("That channel is gone, so there is nothing left to report.");
	}
	const message = await channel.messages.fetch(messageId).catch(() => null);
	if (message === null) throw new UserFacingError("That message has been deleted, so there is nothing left to report.");
	if (reason === "") throw new UserFacingError("Say what is wrong with it, so the moderators know what to look for.");

	const { channelId: destinationId, pingRoleId } = await reportDestination(guild, reporter.id, message);
	const destination = guild.channels.cache.get(destinationId);
	if (destination?.isSendable() !== true) {
		throw new UserFacingError("This server's mod mail channel is gone. Tell a moderator.");
	}

	await destination.send(reportPost({ reporter: reporter.user, message, reason, pingRoleId }));
	noteReport(guild.id, reporter.id, message.id, Date.now());
}
