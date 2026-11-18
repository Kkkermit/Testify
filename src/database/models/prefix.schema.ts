import { model, Schema } from "mongoose";

export interface PrefixSettings {
	guildId: string;
	/** Absent until a server picks one, so it follows the default prefix in `testify.config.json`. */
	prefix?: string;
	/** Prefix commands can be switched off per server; slash commands always work. */
	isEnabled: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const prefixSchema = new Schema<PrefixSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		prefix: { type: String },
		isEnabled: { type: Boolean, required: true, default: true },
	},
	{ timestamps: true },
);

export const GuildPrefix = model<PrefixSettings>("prefix", prefixSchema);
