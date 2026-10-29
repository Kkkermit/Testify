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

	/** A page nested under a section's screen still opens that section. */
	it("opens the Community section for a page nested under one of its screens", () => {
		const [, guildGroup] = navigationFor({ guild, isOwner: false });
		const membersSection = (guildGroup?.sections ?? []).find((section) => section.labelKey === "nav.community");

		expect(membersSection).toBeDefined();
		expect(sectionHolds(membersSection as never, `/guilds/${guild.id}/members/100000000000000002`)).toBe(true);
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
