import { model, Schema } from "mongoose";

/** Daily activity counts per server, channel and member, and who joined or left. Never what anybody wrote. */

interface Expiring {
	guildId: string;
	/** `YYYY-MM-DD`, UTC. */
	day: string;
	expiresAt: Date;
}

export interface ServerDay extends Expiring {
	messages: number;
	joins: number;
	leaves: number;
	/** Messages per UTC hour, keyed "0" to "23"; a map, because an upsert's `$inc` cannot address an array index. */
	hours?: Record<string, number>;
}

export interface ChannelDay extends Expiring {
	channelId: string;
	messages: number;
}

export interface MemberDay extends Expiring {
	userId: string;
	messages: number;
}

export interface MemberMoveRecord {
	guildId: string;
	userId: string;
	/** Kept because somebody who has left can no longer be looked up by id in the server. */
	username: string;
	kind: "join" | "leave";
	at: Date;
	expiresAt: Date;
}

const expiring = {
	guildId: { type: String, required: true },
	day: { type: String, required: true },
	expiresAt: { type: Date, required: true },
};

const serverDaySchema = new Schema<ServerDay>({
	...expiring,
	messages: { type: Number, default: 0 },
	joins: { type: Number, default: 0 },
	leaves: { type: Number, default: 0 },
	hours: { type: Map, of: Number, default: undefined },
});
serverDaySchema.index({ guildId: 1, day: 1 }, { unique: true });
serverDaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const channelDaySchema = new Schema<ChannelDay>({
	...expiring,
	channelId: { type: String, required: true },
	messages: { type: Number, default: 0 },
});
channelDaySchema.index({ guildId: 1, day: 1, channelId: 1 }, { unique: true });
channelDaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const memberDaySchema = new Schema<MemberDay>({
	...expiring,
	userId: { type: String, required: true },
	messages: { type: Number, default: 0 },
});
memberDaySchema.index({ guildId: 1, day: 1, userId: 1 }, { unique: true });
memberDaySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const memberMoveSchema = new Schema<MemberMoveRecord>({
	guildId: { type: String, required: true },
	userId: { type: String, required: true },
	username: { type: String, required: true },
	kind: { type: String, required: true, enum: ["join", "leave"] },
	at: { type: Date, required: true },
	expiresAt: { type: Date, required: true },
});
memberMoveSchema.index({ guildId: 1, kind: 1, at: -1 });
memberMoveSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ServerDays = model<ServerDay>("serverday", serverDaySchema);
export const ChannelDays = model<ChannelDay>("channelday", channelDaySchema);
export const MemberDays = model<MemberDay>("memberday", memberDaySchema);
export const MemberMoves = model<MemberMoveRecord>("membermove", memberMoveSchema);
