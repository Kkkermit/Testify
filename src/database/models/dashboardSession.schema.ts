import { model, Schema } from "mongoose";

export interface DashboardSession {
	/** The cookie value itself: 32 random bytes, base64url. */
	_id: string;
	userId: string;
	username: string;
	avatar: string | null;
	/** Snapshotted at login for rendering. Every request re-checks the live owner list before it gates on this. */
	isOwner: boolean;
	csrfSecret: string;
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: Date;
	guildsCachedAt: Date | null;
	createdAt: Date;
	lastSeenAt: Date;
	expiresAt: Date;
}

const sessionSchema = new Schema<DashboardSession>(
	{
		_id: { type: String, required: true },
		userId: { type: String, required: true },
		username: { type: String, required: true },
		avatar: { type: String, default: null },
		isOwner: { type: Boolean, required: true, default: false },
		csrfSecret: { type: String, required: true },
		accessToken: { type: String, required: true },
		refreshToken: { type: String, required: true },
		tokenExpiresAt: { type: Date, required: true },
		guildsCachedAt: { type: Date, default: null },
		lastSeenAt: { type: Date, required: true, default: Date.now },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: { createdAt: true, updatedAt: false }, _id: false },
);

sessionSchema.index({ userId: 1 });
// Mongo evicts an expired session itself, so an idle login cannot outlive its cookie.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DashboardSessions = model<DashboardSession>("dashboardsession", sessionSchema);
