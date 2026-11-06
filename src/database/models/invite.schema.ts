import { model, Schema } from "mongoose";

/** Whether a server records which invite each member joined with, and where it says so. */
export interface InviteSettingsRecord {
	guildId: string;
	enabled: boolean;
	logChannelId: string | null;
	updatedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

const inviteSettingsSchema = new Schema<InviteSettingsRecord>(
	{
		guildId: { type: String, required: true, unique: true },
		enabled: { type: Boolean, required: true, default: false },
		logChannelId: { type: String, default: null },
		updatedBy: { type: String, default: null },
	},
	{ timestamps: true },
);

export const InviteSettingsConfig = model<InviteSettingsRecord>("invitesettings", inviteSettingsSchema);

/** One member joining one server, and whose invite brought them, when that could be told. */
export interface InviteJoinRecord {
	guildId: string;
	memberId: string;
	/** Kept because somebody who has left can no longer be looked up as a member. */
	memberName: string;
	inviterId: string | null;
	inviterName: string | null;
	code: string | null;
	vanity: boolean;
	joinedAt: Date;
	leftAt: Date | null;
	/** `INVITE_LIMITS.keepDays` after the join, when MongoDB deletes it. */
	expiresAt: Date;
}

const inviteJoinSchema = new Schema<InviteJoinRecord>({
	guildId: { type: String, required: true },
	memberId: { type: String, required: true },
	memberName: { type: String, required: true },
	inviterId: { type: String, default: null },
	inviterName: { type: String, default: null },
	code: { type: String, default: null },
	vanity: { type: Boolean, required: true, default: false },
	joinedAt: { type: Date, required: true },
	leftAt: { type: Date, default: null },
	expiresAt: { type: Date, required: true },
});

inviteJoinSchema.index({ guildId: 1, joinedAt: -1 });
inviteJoinSchema.index({ guildId: 1, inviterId: 1 });
inviteJoinSchema.index({ guildId: 1, memberId: 1, joinedAt: -1 });
inviteJoinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const InviteJoin = model<InviteJoinRecord>("invitejoins", inviteJoinSchema);
