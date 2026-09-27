import { ActivityCounter } from "@lib/info/activity.util";

const AT = new Date("2026-09-27T20:15:00.000Z");
const message = { guildId: "g1", channelId: "c1", userId: "u1" };

describe("ActivityCounter", () => {
	it("counts each message towards its server, channel and member for the day", () => {
		const counter = new ActivityCounter();
		counter.count(message, AT);
		counter.count(message, AT);
		counter.count({ ...message, userId: "u2", channelId: "c2" }, AT);

		const batch = counter.drain();

		expect(batch.servers).toEqual([{ guildId: "g1", day: "2026-09-27", messages: 3, hours: { "20": 3 } }]);
		expect(batch.channels.map((row) => [row.channelId, row.messages])).toEqual([
			["c1", 2],
			["c2", 1],
		]);
		expect(batch.members.map((row) => [row.userId, row.messages])).toEqual([
			["u1", 2],
			["u2", 1],
		]);
	});

	/** A server in two places must never have its counts summed together. */
	it("keeps servers and days apart", () => {
		const counter = new ActivityCounter();
		counter.count(message, AT);
		counter.count({ ...message, guildId: "g2" }, AT);
		counter.count(message, new Date("2026-09-28T01:00:00.000Z"));

		expect(counter.drain().servers.map((row) => `${row.guildId}:${row.day}`)).toEqual([
			"g1:2026-09-27",
			"g2:2026-09-27",
			"g1:2026-09-28",
		]);
	});

	it("starts again from zero once drained", () => {
		const counter = new ActivityCounter();
		counter.count(message, AT);
		counter.drain();

		expect(counter.drain()).toEqual({ servers: [], channels: [], members: [] });
	});

	/** A database blip must delay the counts, never lose them or count what arrived meanwhile twice. */
	it("puts a failed batch back beside what was counted since", () => {
		const counter = new ActivityCounter();
		counter.count(message, AT);
		const failed = counter.drain();
		counter.count(message, AT);

		counter.restore(failed);
		const batch = counter.drain();

		expect(batch.servers[0]).toMatchObject({ messages: 2, hours: { "20": 2 } });
		expect(batch.members[0]?.messages).toBe(2);
		expect(batch.channels[0]?.messages).toBe(2);
	});
});
