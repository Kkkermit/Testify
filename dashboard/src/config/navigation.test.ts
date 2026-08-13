import { allNavItems, navigationFor, type NavAudience, sectionHolds } from "@/config/navigation";

const guild = { id: "900000000000000001", name: "Testify HQ" };

function pathsFor(audience: NavAudience): string[] {
	return allNavItems(navigationFor(audience)).map((item) => item.to);
}

/** Sorted, because which section a screen sits in is a grouping choice and reachability is the rule. */
function sortedPathsFor(audience: NavAudience): string[] {
	return pathsFor(audience).sort();
}

describe("navigationFor", () => {
	it("always offers the server picker and the command list", () => {
		expect(pathsFor({ guild: undefined, isOwner: false })).toEqual(["/guilds", "/commands"]);
	});

	it("adds the current server's screens once one is open", () => {
		expect(sortedPathsFor({ guild, isOwner: false })).toEqual(
			[
				"/guilds",
				`/guilds/${guild.id}/commands`,
				`/guilds/${guild.id}`,
				`/guilds/${guild.id}/levelling`,
				`/guilds/${guild.id}/welcome`,
				`/guilds/${guild.id}/audit-log`,
				`/guilds/${guild.id}/automod`,
				`/guilds/${guild.id}/sticky`,
				`/guilds/${guild.id}/treasure`,
				`/guilds/${guild.id}/tickets`,
				`/guilds/${guild.id}/giveaways`,
				`/guilds/${guild.id}/lottery`,
				`/guilds/${guild.id}/members`,
				`/guilds/${guild.id}/settings`,
			].sort(),
		);
	});

	/** A screen reachable only from a section would be missed by every consumer that reads this list flat. */
	it("counts the screens inside sections as navigation too", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });
		const inSections = (guildGroup?.sections ?? []).flatMap((section) => section.items.map((item) => item.to));

		expect(inSections.length).toBeGreaterThan(0);
		expect(pathsFor({ guild, isOwner: false })).toEqual(expect.arrayContaining(inSections));
	});

	/** The console 404s for anyone else, so offering the link would only be a dead end. */
	it("shows the owner console to an owner and nobody else", () => {
		expect(pathsFor({ guild: undefined, isOwner: true })).toContain("/owner");
		expect(pathsFor({ guild: undefined, isOwner: false })).not.toContain("/owner");
	});

	/** The heading is how anybody knows which server the settings under it belong to. */
	it("puts the server's screens under its name", () => {
		const groups = navigationFor({ guild, isOwner: false });

		expect(groups[0]?.heading).toBeUndefined();
		expect(groups[1]?.heading).toBe("Testify HQ");
	});

	it("keeps the owner console in a group of its own", () => {
		const groups = navigationFor({ guild, isOwner: true });

		expect(groups.at(-1)).toMatchObject({ heading: "Bot", items: [expect.objectContaining({ to: "/owner" })] });
	});

	it("groups nothing under a server heading when no server is open", () => {
		expect(navigationFor({ guild: undefined, isOwner: false })).toHaveLength(1);
	});

	/**
	 * A member's own page is nested under the leaderboards, so a section that only matched exactly would
	 * collapse itself the moment somebody clicked a row and leave nothing in the sidebar marked as current.
	 */
	it("opens the Members section for a page nested under one of its screens", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });
		const membersSection = (guildGroup?.sections ?? []).find((section) => section.labelKey === "nav.members");

		expect(membersSection).toBeDefined();
		expect(sectionHolds(membersSection as never, `/guilds/${guild.id}/members/100000000000000002`)).toBe(true);
	});

	it("names every entry, since the label is the accessible name at the icon-only width", () => {
		for (const item of allNavItems(navigationFor({ guild, isOwner: true }))) {
			expect(item.labelKey.length).toBeGreaterThan(0);
		}
	});
});
