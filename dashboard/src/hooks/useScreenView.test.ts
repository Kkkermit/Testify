import { routePattern } from "@/hooks/useScreenView";

/**
 * The one thing that keeps a screen count from becoming a browsing history: what is sent is the pattern, so no
 * server id and no member id ever reaches the database.
 */
describe("routePattern", () => {
	it("leaves a path with no parameters alone", () => {
		expect(routePattern("/commands", {})).toBe("/commands");
	});

	it("puts a server id back as its parameter name", () => {
		expect(routePattern("/guilds/900000000000000001/levelling", { guildId: "900000000000000001" })).toBe(
			"/guilds/:guildId/levelling",
		);
	});

	it("replaces every parameter, not just the first", () => {
		const pattern = routePattern("/guilds/900000000000000001/members/100000000000000002", {
			guildId: "900000000000000001",
			userId: "100000000000000002",
		});

		expect(pattern).toBe("/guilds/:guildId/members/:userId");
	});

	/** A shorter id inside a longer one would otherwise be replaced within it and leave a fragment of a real id. */
	it("replaces the longest value first", () => {
		const pattern = routePattern("/guilds/12345/members/123", { guildId: "12345", userId: "123" });

		expect(pattern).toBe("/guilds/:guildId/members/:userId");
	});

	it("ignores a parameter that matched nothing", () => {
		expect(routePattern("/commands", { guildId: undefined })).toBe("/commands");
	});

	/** Whatever it returns is what gets stored, so nothing that looks like an id may survive. */
	it("never leaves a snowflake in the result", () => {
		const pattern = routePattern("/guilds/900000000000000001/members/100000000000000002", {
			guildId: "900000000000000001",
			userId: "100000000000000002",
		});

		expect(pattern).not.toMatch(/\d{17,20}/);
	});
});
