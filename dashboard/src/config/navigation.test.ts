import { navigationFor } from "@/config/navigation";

const guild = { id: "900000000000000001", name: "Testify HQ" };

describe("navigationFor", () => {
	it("always offers the server picker", () => {
		expect(navigationFor({ guild: undefined, isOwner: false }).map((item) => item.to)).toEqual([
			"/guilds",
			"/commands",
		]);
	});

	it("adds the current server's screens once one is open", () => {
		expect(navigationFor({ guild, isOwner: false }).map((item) => item.to)).toEqual([
			"/guilds",
			`/guilds/${guild.id}`,
			`/guilds/${guild.id}/levelling`,
			`/guilds/${guild.id}/welcome`,
			`/guilds/${guild.id}/commands`,
		]);
	});

	/** The console 404s for anyone else, so offering the link would only be a dead end. */
	it("shows the owner console to an owner and nobody else", () => {
		expect(navigationFor({ guild: undefined, isOwner: true }).some((item) => item.to === "/owner")).toBe(true);
		expect(navigationFor({ guild: undefined, isOwner: false }).some((item) => item.to === "/owner")).toBe(false);
	});

	/**
	 * The server's own entry stays current while a settings screen under it is open — it is a section, not a
	 * destination, and marking it inactive there loses the sense of where you are.
	 */
	it("keeps the server entry matching its child routes", () => {
		const items = navigationFor({ guild, isOwner: false });

		expect(items.find((item) => item.to === `/guilds/${guild.id}`)?.exact).toBe(false);
		expect(items.find((item) => item.to === `/guilds/${guild.id}/levelling`)?.exact).toBeUndefined();
	});

	it("names every entry, since the label is the accessible name at the icon-only width", () => {
		for (const item of navigationFor({ guild, isOwner: true })) {
			expect(item.label.length).toBeGreaterThan(0);
		}
	});
});
