import { model, Schema } from "mongoose";

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
		minMessages: { type: Number, required: true, default: 15 },
		maxMessages: { type: Number, required: true, default: 50 },
		minAmount: { type: Number, required: true, default: 10 },
		maxAmount: { type: Number, required: true, default: 500 },
		cooldownMs: { type: Number, required: true, default: 300_000 },
		createdBy: { type: String, required: true },
		lastModifiedBy: { type: String, required: true },
	},
	{ timestamps: true },
);

export const TreasureConfig = model<TreasureConfigSettings>("TreasureConfig", treasureSchema);
