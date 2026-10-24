import { model, Schema } from "mongoose";
import { ROLE_MENU_MODES, type RoleMenuMode } from "@testify/shared";

/** A message members press to pick their own roles from a list a manager chose. */
export interface RoleMenuRecord {
	guildId: string;
	channelId: string;
	/** Null until it is posted, and again if the post is removed. */
	messageId: string | null;
	title: string;
	description: string;
	roleIds: string[];
	mode: RoleMenuMode;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const roleMenuSchema = new Schema<RoleMenuRecord>(
	{
		guildId: { type: String, required: true, index: true },
		channelId: { type: String, required: true },
		messageId: { type: String, default: null },
		title: { type: String, required: true },
		description: { type: String, default: "" },
		roleIds: { type: [String], required: true, default: [] },
		mode: { type: String, enum: ROLE_MENU_MODES, required: true, default: "many" },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const RoleMenu = model<RoleMenuRecord>("rolemenus", roleMenuSchema);
