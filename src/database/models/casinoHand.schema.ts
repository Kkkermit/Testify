import { model, Schema, type Types } from "mongoose";

/** A blackjack or hi-lo hand in play: the stake has left the wallet and is held here until the hand settles. */
export interface CasinoHandRecord {
	_id: Types.ObjectId;
	guildId: string;
	userId: string;
	game: "blackjack" | "hilo";
	/** The opening bet. */
	bet: number;
	/** Everything taken for this hand so far, which a double down raises. */
	staked: number;
	/** The game's own state; its shape belongs to `src/lib/casino`. */
	state: unknown;
	/** Raised by every move, so two presses of one button cannot both be played. */
	version: number;
	channelId: string | null;
	messageId: string | null;
	/** Past this, the sweep plays the hand out for the player and pays whatever it is owed. */
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const casinoHandSchema = new Schema<CasinoHandRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		game: { type: String, required: true, enum: ["blackjack", "hilo"] },
		bet: { type: Number, required: true, min: 1 },
		staked: { type: Number, required: true, min: 1 },
		state: { type: Schema.Types.Mixed, required: true },
		version: { type: Number, required: true, default: 0 },
		channelId: { type: String, default: null },
		messageId: { type: String, default: null },
		expiresAt: { type: Date, required: true, index: true },
	},
	{ timestamps: true, minimize: false },
);

// One hand of each game per player per server, enforced by the database rather than by a check that can race.
casinoHandSchema.index({ guildId: 1, userId: 1, game: 1 }, { unique: true });

export const CasinoHand = model<CasinoHandRecord>("casinohands", casinoHandSchema);
