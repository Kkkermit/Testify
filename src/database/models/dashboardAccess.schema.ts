import { model, Schema } from "mongoose";
import { ACCESS_AREAS, type AccessArea } from "@testify/shared";

/** Somebody without Manage Server whom a server's admins gave some of its dashboard screens. */
export interface DashboardAccessRecord {
	guildId: string;
	userId: string;
	/** As they were called when access was given, for a list that outlives their leaving the cache. */
	username: string;
	areas: AccessArea[];
	addedBy: string;
	addedByName: string;
	lastSeenAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

const dashboardAccessSchema = new Schema<DashboardAccessRecord>(
	{
		guildId: { type: String, required: true },
		userId: { type: String, required: true },
		username: { type: String, required: true },
		areas: { type: [String], enum: ACCESS_AREAS, required: true },
		addedBy: { type: String, required: true },
		addedByName: { type: String, required: true },
		lastSeenAt: { type: Date, default: null },
	},
	{ timestamps: true },
);

dashboardAccessSchema.index({ guildId: 1, userId: 1 }, { unique: true });
dashboardAccessSchema.index({ userId: 1 });

export const DashboardAccess = model<DashboardAccessRecord>("dashboardaccess", dashboardAccessSchema);
