import { DAY_MS } from "@config/constants";
import { GitHubTrafficDay, type GitHubTrafficDayRecord } from "@database/models/githubTraffic.schema";
import { SITE_LIMITS, type TrafficDay } from "@testify/shared";

/** GitHub restates a day until it is over, so each answer replaces what was kept for that day. */
export async function keepTrafficDays(days: readonly TrafficDay[], now = Date.now()): Promise<void> {
	if (days.length === 0) return;

	const expiresAt = new Date(now + SITE_LIMITS.trafficDaysKept * DAY_MS);
	await GitHubTrafficDay.bulkWrite(
		days.map(({ date, ...counts }) => ({
			updateOne: { filter: { day: date }, update: { $set: { ...counts, expiresAt } }, upsert: true },
		})),
	);
}

/** Oldest first, from `since` (`YYYY-MM-DD`) on. */
export async function readTrafficDays(since: string): Promise<TrafficDay[]> {
	const rows = await GitHubTrafficDay.find({ day: { $gte: since } })
		.sort({ day: 1 })
		.lean<GitHubTrafficDayRecord[]>()
		.exec();

	return rows.map((row) => ({
		date: row.day,
		views: row.views,
		uniqueViews: row.uniqueViews,
		clones: row.clones,
		uniqueClones: row.uniqueClones,
	}));
}
