import { randomUUID } from "node:crypto";
import { Ticket, type TicketRecord, TicketSetup, type TicketSetupRecord } from "@database/models/tickets.schema";

const UPSERT = { upsert: true as const, new: true as const, lean: true as const, setDefaultsOnInsert: true as const };

export async function getTicketSetup(guildId: string): Promise<TicketSetupRecord | null> {
	return TicketSetup.findOne({ guildId }).lean<TicketSetupRecord>().exec();
}

export async function saveTicketSetup(
	guildId: string,
	fields: Omit<TicketSetupRecord, "guildId" | "createdAt" | "updatedAt">,
): Promise<TicketSetupRecord> {
	return TicketSetup.findOneAndUpdate({ guildId }, { $set: fields }, UPSERT).exec() as Promise<TicketSetupRecord>;
}

export async function deleteTicketSetup(guildId: string): Promise<boolean> {
	return (await TicketSetup.deleteOne({ guildId }).exec()).deletedCount > 0;
}

export async function findOpenTicket(guildId: string, ownerId: string): Promise<TicketRecord | null> {
	return Ticket.findOne({ guildId, ownerId }).lean<TicketRecord>().exec();
}

export async function getTicketByChannel(channelId: string): Promise<TicketRecord | null> {
	return Ticket.findOne({ channelId }).lean<TicketRecord>().exec();
}

/**
 * Ticket IDs are UUID-derived rather than a random five-digit integer, which the
 * previous implementation generated with no uniqueness check at all.
 */
export async function createTicket(input: {
	guildId: string;
	ownerId: string;
	channelId: string;
}): Promise<TicketRecord> {
	const doc = await Ticket.create({
		...input,
		ticketId: randomUUID().slice(0, 8),
		memberIds: [input.ownerId],
		isLocked: false,
		isClaimed: false,
		claimedById: null,
	});
	return doc.toObject<TicketRecord>();
}

export async function setTicketLocked(channelId: string, isLocked: boolean): Promise<TicketRecord | null> {
	return Ticket.findOneAndUpdate({ channelId }, { $set: { isLocked } }, { new: true, lean: true })
		.lean<TicketRecord>()
		.exec();
}

/** Conditional claim, so two moderators clicking at once cannot both win. */
export async function claimTicket(channelId: string, moderatorId: string): Promise<TicketRecord | null> {
	return Ticket.findOneAndUpdate(
		{ channelId, isClaimed: false },
		{ $set: { isClaimed: true, claimedById: moderatorId } },
		{ new: true, lean: true },
	)
		.lean<TicketRecord>()
		.exec();
}

export async function addTicketMember(channelId: string, userId: string): Promise<TicketRecord | null> {
	return Ticket.findOneAndUpdate({ channelId }, { $addToSet: { memberIds: userId } }, { new: true, lean: true })
		.lean<TicketRecord>()
		.exec();
}

export async function removeTicketMember(channelId: string, userId: string): Promise<TicketRecord | null> {
	return Ticket.findOneAndUpdate({ channelId }, { $pull: { memberIds: userId } }, { new: true, lean: true })
		.lean<TicketRecord>()
		.exec();
}

export async function deleteTicket(channelId: string): Promise<boolean> {
	return (await Ticket.deleteOne({ channelId }).exec()).deletedCount > 0;
}

export async function listTickets(guildId: string): Promise<TicketRecord[]> {
	return Ticket.find({ guildId }).sort({ createdAt: -1 }).lean<TicketRecord[]>().exec();
}
