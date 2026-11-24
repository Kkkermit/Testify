import { type GuildMember, type User } from "discord.js";
import { bannerEmbed, userInfoEmbed } from "@lib/info/userCards.util";
import { createMockMember, createMockRole, createMockUser, mockCollection } from "@tests/helpers/mocks";

const user = (overrides: Record<string, unknown> = {}): User =>
	createMockUser({
		displayName: "Alice",
		createdAt: new Date(1_700_000_000_000),
		...overrides,
	});

describe("bannerEmbed", () => {
	it("shows the banner when the user has one", async () => {
		const target = user({
			fetch: jest.fn(() => Promise.resolve({ bannerURL: () => "https://cdn.discord/banner.png" })),
		});

		const data = (await bannerEmbed(target)).toJSON();
		expect(data.image?.url).toBe("https://cdn.discord/banner.png");
	});

	/** `bannerURL()` needs a force-fetched user, or it is always null. */
	it("force-fetches, because a cached user carries no banner", async () => {
		const fetch = jest.fn(() => Promise.resolve({ bannerURL: () => null }));
		await bannerEmbed(user({ fetch }));

		expect(fetch).toHaveBeenCalledWith(true);
	});
});

describe("userInfoEmbed", () => {
	const GUILD = "900000000000000009";
	const everyone = createMockRole({ id: GUILD, name: "@everyone", position: 0 });

	function memberWith(
		roles: ReturnType<typeof createMockRole>[],
		overrides: Record<string, unknown> = {},
	): GuildMember {
		return createMockMember({
			guild: { id: GUILD },
			joinedAt: new Date(1_700_000_100_000),
			nickname: null,
			premiumSince: null,
			roles: {
				highest: roles.at(-1) ?? everyone,
				cache: mockCollection([everyone, ...roles].map((role) => [role.id, role])),
			},
			...overrides,
		} as never);
	}

	const fieldsOf = (member: GuildMember): Record<string, string> =>
		Object.fromEntries((userInfoEmbed(user(), member).toJSON().fields ?? []).map((f) => [f.name, f.value]));

	/** The @everyone role is told by the server's own id, so a role somebody named "@everyone" still counts. */
	it("leaves out the @everyone role by its id, and copes with a join date Discord did not return", () => {
		const named = Object.assign(createMockRole({ id: "2", name: "@everyone", position: 3 }), {
			toString: () => "<@&2>",
		});

		expect(fieldsOf(memberWith([named], { joinedAt: null }))).toMatchObject({
			"Joined server": "Unknown",
			"Highest role": "<@&2>",
			"Roles (1)": "<@&2>",
		});
		expect(fieldsOf(memberWith([]))).toMatchObject({ "Highest role": "None", "Roles (0)": "None" });
	});

	/** Discord rejects a field value over 1024 characters, so the list has to stop, and says how many it left out. */
	it("caps the role list at twenty", () => {
		const roles = Array.from({ length: 40 }, (_unused, index) =>
			createMockRole({ id: String(index), name: `Role${String(index)}`, position: index + 1 }),
		);

		const value = fieldsOf(memberWith(roles))["Roles (40)"] ?? "";
		expect(value.match(/<@&/g)).toHaveLength(20);
		expect(value).toMatch(/and 20 more$/);
	});
});
