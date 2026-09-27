import { model, Schema } from "mongoose";

/** One row per server: whether the casino runs there, which games are open, and the limits on a bet. */
export interface CasinoSettingsRecord {
	guildId: string;
	enabled: boolean;
	/** Only the games switched off are stored, so a game added later starts open everywhere. */
	disabledGames: string[];
	minBet: number;
	/** Null means no ceiling beyond what the player holds. */
	maxBet: number | null;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const casinoSettingsSchema = new Schema<CasinoSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: true },
		disabledGames: { type: [String], required: true, default: [] },
		minBet: { type: Number, required: true, default: 1, min: 1 },
		maxBet: { type: Number, default: null },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const CasinoSettingsConfig = model<CasinoSettingsRecord>("casinosettings", casinoSettingsSchema);
