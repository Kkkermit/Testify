import { createTranscript } from "discord-html-transcripts";
import { ButtonStyle, ChannelType, type Guild, PermissionFlagsBits, type TextChannel, type User } from "discord.js";
import { TICKET } from "@config/constants";
import { strings } from "@config/strings";
import { customId } from "@core/button";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { type TicketRecord, type TicketSetupRecord } from "@database/models/tickets.schema";
import {
	addTicketMember,
	claimTicket,
	createTicket,
	deleteTicket,
	findOpenTicket,
	removeTicketMember,
	setTicketLocked,
} from "@database/repositories/ticketRepository";
import { button, row } from "@lib/discord/components.util";
import { embed } from "@lib/discord/embeds.util";
import { TICKET_ID } from "@lib/tickets/tickets.constants";

/** A ticket from opening to closing: its channel, its permissions, its record and its transcript. */

export function ticketControls() {
	return row(
		button({
			id: customId(TICKET_ID, "close"),
			label: strings.ticket.closeLabel,
			emoji: strings.ticket.closeEmoji,
			style: ButtonStyle.Danger,
		}),
		button({
			id: customId(TICKET_ID, "lock"),
			label: strings.ticket.lockLabel,
			emoji: strings.ticket.lockEmoji,
			style: ButtonStyle.Secondary,
		}),
		button({
			id: customId(TICKET_ID, "unlock"),
			label: strings.ticket.unlockLabel,
			emoji: strings.ticket.unlockEmoji,
			style: ButtonStyle.Secondary,
		}),
		button({
			id: customId(TICKET_ID, "claim"),
			label: strings.ticket.claimLabel,
			emoji: strings.ticket.claimEmoji,
			style: ButtonStyle.Success,
		}),
		button({
			id: customId(TICKET_ID, "members"),
			label: strings.ticket.manageLabel,
			emoji: strings.ticket.manageEmoji,
			style: ButtonStyle.Primary,
		}),
	);
}

/** One open ticket per person, in a private channel only they and the handler role can see. */
export async function openTicket(guild: Guild, setup: TicketSetupRecord, owner: User): Promise<TextChannel> {
	if (await findOpenTicket(guild.id, owner.id)) throw new UserFacingError(strings.ticket.alreadyExists);

	const channel = await guild.channels.create({
		name: `${TICKET.namePrefix}${owner.username}`.slice(0, 100),
		type: ChannelType.GuildText,
		parent: setup.categoryId,
		permissionOverwrites: [
			{ id: setup.everyoneRoleId, deny: [PermissionFlagsBits.ViewChannel] },
			{
				id: owner.id,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.AttachFiles,
				],
			},
			{
				id: setup.handlerRoleId,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.ManageMessages,
				],
			},
		],
	});

	await createTicket({ guildId: guild.id, ownerId: owner.id, channelId: channel.id });
	await channel.send({
		content: `${owner.toString()} <@&${setup.handlerRoleId}>`,
		embeds: [
			embed({
				category: "tickets",
				title: strings.ticket.welcomeTitle,
				description: strings.ticket.welcomeDescription,
			}),
		],
		components: [ticketControls()],
	});

	return channel;
}

/** Locking takes the owner's voice away; the handlers can still write. */
export async function lockTicket(channel: TextChannel, ticket: TicketRecord, locking: boolean): Promise<void> {
	if (ticket.isLocked === locking) {
		throw new UserFacingError(locking ? strings.ticket.alreadyLocked : strings.ticket.alreadyUnlocked);
	}

	await channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: !locking });
	await setTicketLocked(channel.id, locking);
}

export async function claimTicketFor(ticket: TicketRecord, moderatorId: string): Promise<void> {
	if (!(await claimTicket(ticket.channelId, moderatorId))) {
		throw new UserFacingError(`${strings.ticket.alreadyClaimed} <@${ticket.claimedById ?? "unknown"}>.`);
	}
}

/** Whoever could be added to a ticket: people, not bots, and not the person who opened it. */
export async function memberCandidates(guild: Guild, ticket: TicketRecord): Promise<{ id: string; name: string }[]> {
	const candidates = await guild.members.fetch({ limit: 25 });
	const people = candidates
		.filter((candidate) => !candidate.user.bot && candidate.id !== ticket.ownerId)
		.first(25)
		.map((candidate) => ({ id: candidate.id, name: candidate.displayName }));

	if (people.length === 0) throw new UserFacingError("There is nobody else to add.");
	return people;
}

/** Adds somebody who is not on the ticket and removes somebody who is. */
export async function toggleTicketMember(
	channel: TextChannel,
	ticket: TicketRecord,
	userId: string,
): Promise<"added" | "removed"> {
	if (ticket.memberIds.includes(userId)) {
		await channel.permissionOverwrites.delete(userId);
		await removeTicketMember(channel.id, userId);
		return "removed";
	}

	await channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
	await addTicketMember(channel.id, userId);
	return "added";
}

/** Returns without filing anything when the configured channel has gone or the bot can no longer post in it. */
async function fileTranscript(
	client: TestifyClient,
	setup: TicketSetupRecord,
	ticket: TicketRecord,
	channel: TextChannel,
	closedBy: User,
): Promise<void> {
	const destination = await client.channels.fetch(setup.transcriptChannelId).catch(() => null);
	if (destination?.isTextBased() !== true || !destination.isSendable()) return;

	const transcript = await createTranscript(channel, { filename: `ticket-${ticket.ticketId}.html`, poweredBy: false });

	await destination.send({
		embeds: [
			embed({
				category: "tickets",
				title: `Ticket ${ticket.ticketId} closed`,
				fields: [
					{ name: strings.ticket.transcriptMember, value: `<@${ticket.ownerId}>`, inline: true },
					{
						name: strings.ticket.transcriptClaimed,
						value: ticket.claimedById !== null ? `<@${ticket.claimedById}>` : "Nobody",
						inline: true,
					},
					{ name: strings.ticket.transcriptModerator, value: closedBy.toString(), inline: true },
				],
			}),
		],
		files: [transcript],
	});
}

/** Files the transcript, forgets the ticket, and deletes its channel after a pause so the closing note can be read. */
export async function closeTicket(
	client: TestifyClient,
	setup: TicketSetupRecord,
	ticket: TicketRecord,
	channel: TextChannel,
	closedBy: User,
): Promise<void> {
	await fileTranscript(client, setup, ticket, channel, closedBy);
	await deleteTicket(channel.id);

	client.timers.after(`ticket:${channel.id}`, TICKET.closeDelayMs, async () => {
		await channel.delete(`Ticket closed by ${closedBy.username}`).catch(() => null);
	});
}
