import { model, Schema } from "mongoose";

export interface AutoRoleSettings {
	guildId: string;
	roleIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

const autoRoleSchema = new Schema<AutoRoleSettings>(
	{
		guildId: { type: String, required: true, unique: true },
		roleIds: { type: [String], required: true, default: [] },
	},
	{ timestamps: true },
);

export const AutoRole = model<AutoRoleSettings>("autoRoles1742", autoRoleSchema);
