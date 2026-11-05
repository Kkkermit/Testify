import { allNavItems, navigationFor, type NavAudience, sectionHolds } from "@/config/navigation";

const guild = { id: "900000000000000001", name: "Testify HQ" };

function pathsFor(audience: NavAudience): string[] {
	return allNavItems(navigationFor(audience)).map((item) => item.to);
}

describe("navigationFor", () => {
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

	/** A collapsed section opens on arrival when the page is one of its own, and stays shut for any other. */
	it("opens a section for its own screens and no others", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });
		const moderation = (guildGroup?.sections ?? []).find((section) => section.labelKey === "nav.moderation");

		expect(moderation).toBeDefined();
		expect(sectionHolds(moderation as never, `/guilds/${guild.id}/cases`)).toBe(true);
		expect(sectionHolds(moderation as never, `/guilds/${guild.id}/welcome`)).toBe(false);
	});

	/** Help articles, bookmarks and quick search all name these paths, so regrouping must never drop one. */
	it("keeps every server screen reachable", () => {
		const prefix = `/guilds/${guild.id}`;
		const screens = pathsFor({ guild, isOwner: false })
			.filter((path) => path.startsWith(prefix))
			.map((path) => path.slice(prefix.length) || "/")
			.sort();

		expect(screens).toEqual(
			[
				"/",
				"/announcements",
				"/audit-log",
				"/auto-responders",
				"/automod",
				"/bans",
				"/birthdays",
				"/bot-stats",
				"/cases",
				"/casino",
				"/changes",
				"/channel-tools",
				"/commands",
				"/channels",
				"/giveaways",
				"/ideas",
				"/inbox",
				"/insights",
				"/levelling",
				"/lottery",
				"/member-count",
				"/members",
				"/music",
				"/raid-protection",
				"/role-menus",
				"/roles",
				"/scheduled-messages",
				"/settings",
				"/starboard",
				"/sticky",
				"/temp-voice",
				"/tickets",
				"/treasure",
				"/warnings",
				"/week",
				"/welcome",
			].sort(),
		);
	});

	/** A feature is looked for under what it is for, so no section is a catch-all and each holds only its own. */
	it("puts each feature page under the section its purpose names", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });
		const prefix = `/guilds/${guild.id}`;
		const sections = Object.fromEntries(
			(guildGroup?.sections ?? []).map((section) => [
				section.labelKey,
				section.items.map((item) => item.to.slice(prefix.length)).sort(),
			]),
		);

		expect(sections).toEqual({
			"nav.community": ["/birthdays", "/ideas", "/levelling", "/role-menus", "/starboard", "/temp-voice", "/welcome"],
			"nav.messages": ["/announcements", "/auto-responders", "/scheduled-messages", "/sticky"],
			"nav.moderation": [
				"/audit-log",
				"/automod",
				"/bans",
				"/cases",
				"/changes",
				"/channel-tools",
				"/raid-protection",
				"/tickets",
				"/warnings",
			],
			"nav.stats": ["/bot-stats", "/insights", "/member-count"],
			"nav.economy": ["/casino", "/lottery", "/treasure"],
			"nav.entertainment": ["/giveaways", "/music"],
		});
	});

	/** A heading over a single screen is a click that leads nowhere new, and says the grouping has gone wrong. */
	it("gives every section more than one screen", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });

		for (const section of guildGroup?.sections ?? []) {
			expect(section.items.length).toBeGreaterThan(1);
		}
	});

	/** Within a section a repeated icon is the only thing telling two rows apart at the icon-only width. */
	it("never gives two screens in one section the same icon", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });

		for (const section of guildGroup?.sections ?? []) {
			const icons = section.items.map((item) => item.icon);
			expect(new Set(icons).size).toBe(icons.length);
		}
	});

	it("names every entry, since the label is the accessible name at the icon-only width", () => {
		for (const item of allNavItems(navigationFor({ guild, isOwner: true }))) {
			expect(item.labelKey.length).toBeGreaterThan(0);
		}
	});
});
