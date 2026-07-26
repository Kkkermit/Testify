import { model, Schema } from "mongoose";

export interface UserLevelRecord {
	guildId: string;
	userId: string;
	xp: number;
	level: number;
	background: string | null;
	barColor: string | null;
	borderColor: string | null;
	blur: number;
	lastMessageAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const userLevelSchema = new Schema<UserLevelRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		xp: { type: Number, required: true, default: 0 },
		level: { type: Number, required: true, default: 0 },
		background: { type: String, default: null },
		barColor: { type: String, default: null },
		borderColor: { type: String, default: null },
		blur: { type: Number, required: true, default: 0 },
		lastMessageAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, level: -1, xp: -1 });

export const UserLevel = model<UserLevelRecord>("UserLevel", userLevelSchema);
