import { model, Schema } from "mongoose";

/** Somebody who asked not to be counted in the bot's usage analytics; bot-wide, so no server is named. */
export interface AnalyticsOptOutRecord {
	userId: string;
	at: Date;
}

const analyticsOptOutSchema = new Schema<AnalyticsOptOutRecord>({
	userId: { type: String, required: true },
	at: { type: Date, required: true },
});

analyticsOptOutSchema.index({ userId: 1 }, { unique: true });

export const AnalyticsOptOut = model<AnalyticsOptOutRecord>("analyticsoptouts", analyticsOptOutSchema);
