import { model, Schema } from "mongoose";
import { DEFAULT_PREFIX } from "@config/constants";

export interface PrefixSettings {
	guildId: string;
	prefix: string;
	/** Prefix commands can be switched off per server; slash commands always work. */
	isEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const prefixSchema = new Schema<PrefixSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		prefix: { type: String, required: true, default: DEFAULT_PREFIX },
		isEnabled: { type: Boolean, required: true, default: true },
	},
	{ timestamps: true },
);

export const GuildPrefix = model<PrefixSettings>("prefix", prefixSchema);
