import { model, Schema } from "mongoose";

export interface TicketSetupRecord {
	guildId: string;
	channelId: string;
	categoryId: string;
	transcriptChannelId: string;
	handlerRoleId: string;
	everyoneRoleId: string;
	description: string;
	buttonLabel: string;
	buttonEmoji: string;
	createdAt: Date;
	updatedAt: Date;
}

const ticketSetupSchema = new Schema<TicketSetupRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		channelId: { type: String, required: true },
		categoryId: { type: String, required: true },
		transcriptChannelId: { type: String, required: true },
		handlerRoleId: { type: String, required: true },
		everyoneRoleId: { type: String, required: true },
		description: { type: String, required: true, default: "Click the button below to open a ticket." },
		buttonLabel: { type: String, required: true, default: "Create ticket" },
		buttonEmoji: { type: String, required: true, default: "🎫" },
	},
	{ timestamps: true },
);

export const TicketSetup = model<TicketSetupRecord>("TicketSetup", ticketSetupSchema);

export interface TicketRecord {
	guildId: string;
	ownerId: string;
	memberIds: string[];
	ticketId: string;
	channelId: string;
	isLocked: boolean;
	isClaimed: boolean;
	claimedById: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const ticketSchema = new Schema<TicketRecord>(
	{
		guildId: { type: String, required: true },
		ownerId: { type: String, required: true },
		memberIds: { type: [String], required: true, default: [] },
		ticketId: { type: String, required: true },
		channelId: { type: String, required: true, unique: true },
		isLocked: { type: Boolean, required: true, default: false },
		isClaimed: { type: Boolean, required: true, default: false },
		claimedById: { type: String, default: null },
	},
	{ timestamps: true },
);

ticketSchema.index({ guildId: 1, ownerId: 1 });
ticketSchema.index({ guildId: 1, ticketId: 1 }, { unique: true });

export const Ticket = model<TicketRecord>("Ticket", ticketSchema);
