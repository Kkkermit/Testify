import { ChannelType, type Guild, type GuildMember, type User } from "discord.js";
import { strings } from "@config/strings";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { getTicketByChannel, getTicketSetup, listOpenTickets } from "@database/repositories/ticketRepository";
import { embed } from "@lib/discord/embeds.util";
import { closeTicket } from "@lib/tickets/ticketFlow.util";
import { type OpenTicketList } from "@testify/shared";

/** The tickets still open in a server, for the dashboard, and closing one the way its Close button does. */

/** No reader means a bot owner; anybody else needs the role the Close button asks of somebody else's ticket. */
export function mayClose(reader: GuildMember | undefined, handlerRoleId: string | null): boolean {
	if (reader === undefined) return true;
	return handlerRoleId !== null && reader.roles.cache.has(handlerRoleId);
}

/** Names come from the cache, then from Discord, so a member who has left still reads as who they were. */
async function nameOf(client: TestifyClient, guild: Guild, userId: string): Promise<string> {
	const member = guild.members.cache.get(userId);
	if (member !== undefined) return member.displayName;
	return (await client.users.fetch(userId).catch(() => null))?.username ?? userId;
}

export async function readOpenTickets(
	client: TestifyClient,
	guild: Guild,
	reader: GuildMember | undefined,
): Promise<OpenTicketList> {
	const [setup, tickets] = await Promise.all([getTicketSetup(guild.id), listOpenTickets(guild.id)]);

	return {
		canClose: setup !== null && mayClose(reader, setup.handlerRoleId || null),
		tickets: await Promise.all(
			tickets.map(async (ticket) => ({
				channelId: ticket.channelId,
				channelName: guild.channels.cache.get(ticket.channelId)?.name ?? null,
				ticketId: ticket.ticketId,
				ownerId: ticket.ownerId,
				ownerName: await nameOf(client, guild, ticket.ownerId),
				claimedById: ticket.claimedById,
				claimedByName: ticket.claimedById === null ? null : await nameOf(client, guild, ticket.claimedById),
				isLocked: ticket.isLocked,
				openedAt: ticket.createdAt.toISOString(),
			})),
		),
	};
}

/** Says so in the ticket first, as the button does, then files the transcript and deletes the channel. */
export async function closeTicketFrom(
	client: TestifyClient,
	guild: Guild,
	channelId: string,
	closedBy: User,
	reader: GuildMember | undefined,
): Promise<void> {
	const setup = await getTicketSetup(guild.id);
	if (setup === null) throw new UserFacingError("The ticket system is not set up here.");
	if (!mayClose(reader, setup.handlerRoleId || null)) throw new UserFacingError(strings.ticket.noPermissions);

	const ticket = await getTicketByChannel(channelId);
	if (ticket?.guildId !== guild.id) throw new UserFacingError("That ticket is not open in this server.");

	const channel = guild.channels.cache.get(channelId);
	if (channel?.type !== ChannelType.GuildText) {
		throw new UserFacingError("That ticket's channel is gone, so there is nothing to close.");
	}

	await channel
		.send({
			embeds: [
				embed({
					category: "tickets",
					title: strings.ticket.closingTitle,
					description: strings.ticket.closingDescription,
				}),
			],
		})
		.catch(() => null);
	await closeTicket(client, setup, ticket, channel, closedBy);
}
