import { model, Schema } from "mongoose";

/**
 * One row per dashboard screen per day, incremented in place.
 *
 * Deliberately narrower than `commandusage`, which carries a guild id: a server usually has one or two people
 * who can open this dashboard, so a per-guild view count would be a record of what one identifiable person
 * looked at rather than an aggregate. Bot-wide is enough to answer the question the count exists for — which
 * screens are worth investing in — without becoming a browsing history.
 *
 * The route is the **pattern** (`/guilds/:guildId/levelling`), never the address, so no id is stored at all.
 */
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
