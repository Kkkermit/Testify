import { model, Schema, SchemaTypes } from "mongoose";

/** Persistence for `discord-giveaways`. */
export interface GiveawayRecord {
	messageId: string;
	channelId: string;
	guildId: string;
	startAt: number;
	endAt: number;
	ended: boolean;
	winnerCount: number;
	prize: string;
	hostedBy?: string;
	winnerIds?: string[];
	isDrop?: boolean;
	botsCanWin?: boolean;
	thumbnail?: string;
	image?: string;
	messages?: Record<string, unknown>;
	extraData?: unknown;
	lastChance?: Record<string, unknown>;
	pauseOptions?: Record<string, unknown>;
	allowedMentions?: Record<string, unknown>;
	embedColor?: unknown;
	embedColorEnd?: unknown;
	reaction?: unknown;
	exemptMembers?: string;
	bonusEntries?: string;
	exemptPermissions?: unknown[];
}

const giveawaySchema = new Schema<GiveawayRecord>(
	{
		messageId: { type: String, required: true },
		channelId: { type: String, required: true },
		guildId: { type: String, required: true },
		startAt: { type: Number, required: true },
		endAt: { type: Number, required: true },
		ended: { type: Boolean, required: true, default: false },
		winnerCount: { type: Number, required: true, default: 1 },
		prize: { type: String, required: true },
		hostedBy: String,
		winnerIds: { type: [String], default: undefined },
		isDrop: Boolean,
		botsCanWin: Boolean,
		thumbnail: String,
		image: String,
		messages: SchemaTypes.Mixed,
		extraData: SchemaTypes.Mixed,
		lastChance: SchemaTypes.Mixed,
		pauseOptions: SchemaTypes.Mixed,
		allowedMentions: SchemaTypes.Mixed,
		embedColor: SchemaTypes.Mixed,
		embedColorEnd: SchemaTypes.Mixed,
		reaction: SchemaTypes.Mixed,
		exemptMembers: String,
		bonusEntries: String,
		exemptPermissions: { type: [SchemaTypes.Mixed], default: undefined },
	},
	{ id: false },
);

giveawaySchema.index({ messageId: 1 }, { unique: true });
giveawaySchema.index({ guildId: 1, ended: 1 });

export const Giveaway = model<GiveawayRecord>("giveaways_x", giveawaySchema);
