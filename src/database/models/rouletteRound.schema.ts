import { model, Schema, type Types } from "mongoose";

export interface RouletteBetRecord {
	/** `n17`, or an outside bet's name. */
	spot: string;
	amount: number;
}

/** One player at the table; stakes leave the wallet as each chip is placed. */
export interface RouletteSeat {
	name: string;
	/** Orders the seats, which is what gives each player their chip colour. */
	joinedAt: number;
	/** What a chip is worth for this player; the round's own chip until they change it. */
	chip?: number;
	bets: RouletteBetRecord[];
}

/** A shared round of roulette: open for bets until `closesAt`, then spun once and paid. */
export interface RouletteRoundRecord {
	_id: Types.ObjectId;
	guildId: string;
	channelId: string;
	messageId: string | null;
	hostId: string;
	/** The chip everybody starts with. */
	chip: number;
	status: "betting" | "spinning" | "settled";
	/** Null until the first bet lands, which is what starts the countdown. */
	closesAt: Date | null;
	pocket: number | null;
	/** Keyed by user id. */
	players: Record<string, RouletteSeat>;
	/** A settled round is kept this long for its message, then removed. */
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const rouletteRoundSchema = new Schema<RouletteRoundRecord>(
	{
		guildId: { type: String, required: true },
		channelId: { type: String, required: true },
		messageId: { type: String, default: null },
		hostId: { type: String, required: true },
		chip: { type: Number, required: true, min: 1 },
		status: { type: String, required: true, enum: ["betting", "spinning", "settled"], default: "betting" },
		closesAt: { type: Date, default: null },
		pocket: { type: Number, default: null },
		players: { type: Schema.Types.Mixed, required: true, default: {} },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true, minimize: false },
);

rouletteRoundSchema.index({ status: 1, closesAt: 1 });
rouletteRoundSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// One open round per message, so two Play again presses cannot both start one there.
rouletteRoundSchema.index(
	{ messageId: 1 },
	{ unique: true, partialFilterExpression: { status: "betting", messageId: { $type: "string" } } },
);

export const RouletteRound = model<RouletteRoundRecord>("rouletterounds", rouletteRoundSchema);
