import { ActivityCounter } from "@lib/info/activity.util";

const AT = new Date("2026-09-27T20:15:00.000Z");
const message = { guildId: "g1", channelId: "c1", userId: "u1" };

describe("ActivityCounter", () => {
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
