import { AnalyticsOptOut, type AnalyticsOptOutRecord } from "@database/models/analyticsOptOut.schema";

export async function readOptOuts(): Promise<string[]> {
	const rows = await AnalyticsOptOut.find({}, { userId: 1 }).lean<Pick<AnalyticsOptOutRecord, "userId">[]>().exec();
	return rows.map((row) => row.userId);
}

export async function isOptedOut(userId: string): Promise<boolean> {
	return (await AnalyticsOptOut.exists({ userId }).exec()) !== null;
}

/** Idempotent either way, so a second press or two at once leave one answer. */
export async function saveOptOut(userId: string, optedOut: boolean, at: Date = new Date()): Promise<void> {
	if (optedOut) {
		await AnalyticsOptOut.updateOne({ userId }, { $setOnInsert: { userId, at } }, { upsert: true }).exec();
		return;
	}
	await AnalyticsOptOut.deleteOne({ userId }).exec();
}
