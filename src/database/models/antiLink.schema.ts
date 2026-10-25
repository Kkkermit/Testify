import { model, Schema } from "mongoose";

export interface AntiLinkSettings {
	guildId: string;
	/** Permission flag name a member needs to be allowed to post links. */
	bypassPermission: string;
	createdAt: Date;
	updatedAt: Date;
}

const antiLinkSchema = new Schema<AntiLinkSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		bypassPermission: { type: String, required: true, default: "ManageMessages" },
	},
	{ timestamps: true },
);

export const AntiLink = model<AntiLinkSettings>("links", antiLinkSchema);
