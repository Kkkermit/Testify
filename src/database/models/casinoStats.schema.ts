import { model, Schema } from "mongoose";
import { CASINO_GAMES, type CasinoGame } from "@testify/shared";

/** One player's running totals at one game in one server, added to as each game settles. */
export interface CasinoStatsRecord {
	guildId: string;
	userId: string;
	game: CasinoGame;
	plays: number;
	/** Everything staked, a double down included. */
	wagered: number;
	/** Everything handed back, stakes included. */
	returned: number;
	wins: number;
	losses: number;
	pushes: number;
	/** The most one game came out ahead by. */
	biggestWin: number;
	biggestBet: number;
	createdAt: Date;
	updatedAt: Date;
}

const casinoStatsSchema = new Schema<CasinoStatsRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		game: { type: String, required: true, enum: CASINO_GAMES },
		plays: { type: Number, required: true, default: 0 },
		wagered: { type: Number, required: true, default: 0 },
		returned: { type: Number, required: true, default: 0 },
		wins: { type: Number, required: true, default: 0 },
		losses: { type: Number, required: true, default: 0 },
		pushes: { type: Number, required: true, default: 0 },
		biggestWin: { type: Number, required: true, default: 0 },
		biggestBet: { type: Number, required: true, default: 0 },
	},
	{ timestamps: true },
);

casinoStatsSchema.index({ guildId: 1, game: 1, userId: 1 }, { unique: true });

export const CasinoStats = model<CasinoStatsRecord>("casinostats", casinoStatsSchema);
