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
	function memberWith(overrides: Record<string, unknown> = {}): GuildMember {
		const everyone = createMockRole({ name: "@everyone", position: 0 });
		const staff = createMockRole({ name: "Staff", position: 5 });

		return createMockMember({
			joinedAt: new Date(1_700_000_100_000),
			nickname: null,
			premiumSince: null,
			roles: {
				highest: staff,
				cache: mockCollection([
					["0", everyone],
					["1", staff],
				]),
			},
			...overrides,
		} as never);
	}

	it("copes with a member whose join date Discord did not return", () => {
		const member = memberWith({ joinedAt: null });
		const field = userInfoEmbed(user(), member)
			.toJSON()
			.fields?.find((f) => f.name === "Joined server");

		expect(field?.value).toBe("Unknown");
	});

	/** Discord rejects a field value over 1024 characters, so the list has to stop. */
	it("caps the role list at twenty", () => {
		const roles = Array.from({ length: 40 }, (_unused, index) =>
			createMockRole({ name: `Role${index}`, position: index + 1 }),
		);
		const member = memberWith({
			roles: {
				highest: roles[39],
				cache: mockCollection(roles.map((role, index) => [String(index), role])),
			},
		});

		const field = userInfoEmbed(user(), member)
			.toJSON()
			.fields?.find((f) => f.name.startsWith("Roles"));
		expect(field?.value.split(" ")).toHaveLength(20);
	});
});
