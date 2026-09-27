import { describeWithMongo } from "../helpers/mongo";
import { readInsightRows, recentMoves, recordMove, saveActivity } from "@database/repositories/insightsRepository";

const GUILD = "111111111111111111";
const NOW = new Date("2026-09-27T20:00:00.000Z");

describeWithMongo("insightsRepository", () => {
	/** An upsert's `$inc` into an hour that does not exist yet is the one write here that can go wrong silently. */
	it("adds a second flush to the first rather than replacing it", async () => {
		const batch = {
			servers: [{ guildId: GUILD, day: "2026-09-27", messages: 3, hours: { "20": 3 } }],
			channels: [{ guildId: GUILD, day: "2026-09-27", channelId: "c1", messages: 3 }],
			members: [{ guildId: GUILD, day: "2026-09-27", userId: "u1", messages: 3 }],
		};

		await saveActivity(batch, NOW);
		await saveActivity(batch, NOW);
		const rows = await readInsightRows(GUILD, "2026-09-21");

		expect(rows.days[0]).toMatchObject({ messages: 6, hours: { "20": 6 } });
		expect(rows.channels).toEqual([{ channelId: "c1", messages: 6 }]);
		expect(rows.members).toEqual([{ userId: "u1", messages: 6 }]);
		expect(rows.activeMembers).toBe(1);
		expect(rows.firstDay).toBe("2026-09-27");
	});

	it("counts a join and a leave against the day and remembers who it was", async () => {
		await recordMove({ guildId: GUILD, userId: "u2", username: "kate", kind: "join" }, NOW);
		await recordMove({ guildId: GUILD, userId: "u3", username: "marcus", kind: "leave" }, NOW);

		const rows = await readInsightRows(GUILD, "2026-09-21");
		const left = await recentMoves(GUILD, "leave");

		expect(rows.days[0]).toMatchObject({ joins: 1, leaves: 1 });
		expect(left.map((move) => move.username)).toEqual(["marcus"]);
	});

	it("never reads another server's counts", async () => {
		expect((await readInsightRows("999999999999999999", "2026-09-21")).days).toEqual([]);
	});
});
