import { model, Schema } from "mongoose";

/** A role a server sells in its shop, and what it costs. */
export interface ShopRoleRecord {
	guildId: string;
	roleId: string;
	price: number;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const shopRoleSchema = new Schema<ShopRoleRecord>(
	{
		guildId: { type: String, required: true },
		roleId: { type: String, required: true },
		price: { type: Number, required: true, min: 1 },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

shopRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

export const ShopRoleEntry = model<ShopRoleRecord>("shoproles", shopRoleSchema);
