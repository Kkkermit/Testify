import { model, Schema } from "mongoose";

/** One row per dashboard route pattern per day; no guild id, because a server's few managers are identifiable. */
export interface ScreenView {
	/** `YYYY-MM-DD`, UTC — a string so a day is one exact-match key rather than a range scan. */
	day: string;
	route: string;
	count: number;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const screenViewSchema = new Schema<ScreenView>(
	{
		day: { type: String, required: true },
		route: { type: String, required: true },
		count: { type: Number, required: true, default: 0 },
		expiresAt: { type: Date, required: true },
	},
	{ timestamps: true },
);

screenViewSchema.index({ day: 1, route: 1 }, { unique: true });
screenViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ScreenViews = model<ScreenView>("screenview", screenViewSchema);
