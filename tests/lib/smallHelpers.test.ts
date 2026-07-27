import { type TestifyClient } from "@core/client";
import { activeHeists } from "@lib/heistState.util";
import { botStatsEmbed } from "@lib/statsEmbed.util";
import { createMockClient, mockCollection } from "@tests/helpers/mocks";

describe("activeHeists", () => {
	it("hands back the same map, so a heist survives between interactions", () => {
		expect(activeHeists()).toBe(activeHeists());
	});

	it("stores a heist per guild, so two servers can run one at once", () => {
		const heists = activeHeists();
		heists.clear();

		heists.set("g1", { guildId: "g1" } as never);
		heists.set("g2", { guildId: "g2" } as never);

		expect(heists.size).toBe(2);
		heists.clear();
	});
});

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

	it("totals members across every server", () => {
		const rendered = JSON.stringify(botStatsEmbed(clientWith()).toJSON());
		expect(rendered).toContain("200");
	});

	it("lists the runtime facts an operator needs", () => {
		const names = botStatsEmbed(clientWith())
			.toJSON()
			.fields?.map((field) => field.name);

		expect(names).toEqual(
			expect.arrayContaining(["Servers", "Members", "Commands", "Uptime", "Latency", "Heap", "Node", "discord.js"]),
		);
	});

	/** A websocket that has not settled reports -1, which must not reach the embed. */
	it("never shows a negative latency", () => {
		const field = botStatsEmbed(clientWith({ ws: { ping: -1 } }))
			.toJSON()
			.fields?.find((entry) => entry.name === "Latency");

		expect(field?.value).toBe("0ms");
	});

	it("rounds a fractional latency", () => {
		const field = botStatsEmbed(clientWith({ ws: { ping: 42.7 } }))
			.toJSON()
			.fields?.find((entry) => entry.name === "Latency");

		expect(field?.value).toBe("43ms");
	});

	it("falls back to a placeholder name before the client is ready", () => {
		expect(botStatsEmbed(clientWith({ user: null })).toJSON().title).toContain("Bot");
	});

	it("says how often it refreshes, since the message updates in place", () => {
		expect(botStatsEmbed(clientWith()).toJSON().footer?.text).toMatch(/five minutes/);
	});
});
