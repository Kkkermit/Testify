import { type TestifyClient } from "@core/client";
import { botStatsEmbed } from "@lib/info/statsEmbed.util";
import { createMockClient, mockCollection } from "@tests/helpers/mocks";

describe("botStatsEmbed", () => {
	function clientWith(overrides: Record<string, unknown> = {}): TestifyClient {
		return createMockClient({
			user: { username: "Testify", displayAvatarURL: () => "https://cdn.discord/bot.png" },
			guilds: { cache: mockCollection([["g1", { memberCount: 120 }] as never, ["g2", { memberCount: 80 }] as never]) },
			commands: mockCollection([["ping", {}] as never]),
			ws: { ping: 42 },
			startedAt: Date.now() - 3_600_000,
			...overrides,
		} as never);
	}

	/** A websocket that has not settled reports -1, which must not reach the embed. */
	it("never shows a negative latency", () => {
		const field = botStatsEmbed(clientWith({ ws: { ping: -1 } }))
			.toJSON()
			.fields?.find((entry) => entry.name === "Latency");

		expect(field?.value).toBe("0ms");
	});
});
