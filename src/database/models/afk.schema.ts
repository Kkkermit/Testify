import { model, Schema } from "mongoose";
import { AFK } from "@config/constants";

/** A member's away note in one server, kept until they next speak there. */
export interface AfkRecord {
	guildId: string;
	userId: string;
	/** Empty when they set none. */
	note: string;
	createdAt: Date;
	updatedAt: Date;
}

const afkSchema = new Schema<AfkRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		note: { type: String, default: "" },
	},
	{ timestamps: true },
);

afkSchema.index({ guildId: 1, userId: 1 }, { unique: true });
afkSchema.index({ updatedAt: 1 }, { expireAfterSeconds: AFK.keepDays * 24 * 60 * 60 });

export const AfkStatus = model<AfkRecord>("afk", afkSchema);
