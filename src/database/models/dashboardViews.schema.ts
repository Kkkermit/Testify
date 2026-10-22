import { model, Schema } from "mongoose";

/** Dashboard screens opened in one server, per day; no user id and no route, so it says which servers use it. */
export interface DashboardView {
	/** `YYYY-MM-DD`, UTC — a string so a day is one exact-match key rather than a range scan. */
	day: string;
	guildId: string;
	count: number;
	expiresAt: Date;
}

const dashboardViewSchema = new Schema<DashboardView>({
	day: { type: String, required: true },
	guildId: { type: String, required: true },
	count: { type: Number, required: true, default: 0 },
	expiresAt: { type: Date, required: true },
});

dashboardViewSchema.index({ day: 1, guildId: 1 }, { unique: true });
dashboardViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DashboardViews = model<DashboardView>("dashboardview", dashboardViewSchema);
