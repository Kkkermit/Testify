import { model, Schema } from "mongoose";
import { TREASURE_DEFAULTS } from "@testify/shared";

export interface TreasureConfigSettings {
	guildId: string;
	isEnabled: boolean;
	minMessages: number;
	maxMessages: number;
	minAmount: number;
	maxAmount: number;
	cooldownMs: number;
	createdBy: string;
	lastModifiedBy: string;
	createdAt: Date;
	updatedAt: Date;
}

const treasureSchema = new Schema<TreasureConfigSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		isEnabled: { type: Boolean, required: true, default: true },
		minMessages: { type: Number, required: true, default: TREASURE_DEFAULTS.minMessages },
		maxMessages: { type: Number, required: true, default: TREASURE_DEFAULTS.maxMessages },
		minAmount: { type: Number, required: true, default: TREASURE_DEFAULTS.minAmount },
		maxAmount: { type: Number, required: true, default: TREASURE_DEFAULTS.maxAmount },
		cooldownMs: { type: Number, required: true, default: TREASURE_DEFAULTS.cooldownMs },
		createdBy: { type: String, required: true },
		lastModifiedBy: { type: String, required: true },
	},
	{ timestamps: true },
);

export const TreasureConfig = model<TreasureConfigSettings>("TreasureConfig", treasureSchema);
