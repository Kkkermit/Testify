import { describeWithMongo } from "../helpers/mongo";
import { keepTrafficDays, readTrafficDays } from "@database/repositories/githubTrafficRepository";

const day = (date: string, views: number) => ({ date, views, uniqueViews: 1, clones: 0, uniqueClones: 0 });

describeWithMongo("githubTrafficRepository", () => {
	/** GitHub restates today's count on every answer, so a day is replaced rather than added to. */
	it("keeps one row a day, replaced by GitHub's later answer", async () => {
		await keepTrafficDays([day("2026-10-27", 3), day("2026-10-28", 1)]);
		await keepTrafficDays([day("2026-10-28", 9)]);

		expect(await readTrafficDays("2026-10-01")).toEqual([day("2026-10-27", 3), day("2026-10-28", 9)]);
	});

	it("reads only the days from the one asked for, oldest first", async () => {
		await keepTrafficDays([day("2026-10-28", 2), day("2026-09-01", 5), day("2026-10-01", 4)]);

		expect((await readTrafficDays("2026-10-01")).map((entry) => entry.date)).toEqual(["2026-10-01", "2026-10-28"]);
	});
});
