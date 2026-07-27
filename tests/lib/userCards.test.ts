import { type GuildMember, type User } from "discord.js";
import { avatarEmbed, bannerEmbed, userInfoEmbed } from "@lib/userCards.util";
import { createMockMember, createMockRole, createMockUser, mockCollection, USER_ID } from "@tests/helpers/mocks";

const user = (overrides: Record<string, unknown> = {}): User =>
	createMockUser({
		displayName: "Alice",
		createdAt: new Date(1_700_000_000_000),
		...overrides,
	});

describe("avatarEmbed", () => {
	it("shows the avatar full size, not as a thumbnail", () => {
		const data = avatarEmbed(user()).toJSON();

		expect(data.image?.url).toBeDefined();
		expect(data.title).toContain("avatar");
	});

	it("asks for a large avatar", () => {
		const target = user();
		avatarEmbed(target);

		expect(target.displayAvatarURL).toHaveBeenCalledWith({ size: 1024 });
	});
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

	it("says so plainly when there is no banner", async () => {
		const target = user({ fetch: jest.fn(() => Promise.resolve({ bannerURL: () => null })) });

		const data = (await bannerEmbed(target)).toJSON();
		expect(data.description).toContain("does not have a banner");
		expect(data.image).toBeUndefined();
	});

	it("treats an undefined banner the same as a missing one", async () => {
		const target = user({ fetch: jest.fn(() => Promise.resolve({ bannerURL: () => undefined })) });

		expect((await bannerEmbed(target)).toJSON().description).toContain("does not have a banner");
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

	it("reports the basics for a user with no member record", () => {
		const data = userInfoEmbed(user(), null).toJSON();
		const names = data.fields?.map((field) => field.name);

		expect(names).toEqual(["Username", "ID", "Bot", "Account created"]);
		expect(data.footer?.text).toContain(USER_ID);
	});

	it("says whether the account is a bot", () => {
		expect(JSON.stringify(userInfoEmbed(user({ bot: true }), null).toJSON())).toContain("Yes");
		expect(JSON.stringify(userInfoEmbed(user({ bot: false }), null).toJSON())).toContain("No");
	});

	it("adds the server-specific fields when there is a member", () => {
		const names = userInfoEmbed(user(), memberWith())
			.toJSON()
			.fields?.map((field) => field.name);

		expect(names).toEqual(expect.arrayContaining(["Joined server", "Nickname", "Highest role", "Boosting since"]));
	});

	it("counts roles without counting @everyone", () => {
		const names = userInfoEmbed(user(), memberWith())
			.toJSON()
			.fields?.map((field) => field.name);
		expect(names).toEqual(expect.arrayContaining(["Roles (1)"]));
	});

	it('reports "None" rather than @everyone as the highest role', () => {
		const everyone = createMockRole({ name: "@everyone", position: 0 });
		const member = memberWith({ roles: { highest: everyone, cache: mockCollection([["0", everyone]]) } });

		const highest = userInfoEmbed(user(), member)
			.toJSON()
			.fields?.find((field) => field.name === "Highest role");
		expect(highest?.value).toBe("None");
	});

	it("handles a member with no roles beyond @everyone", () => {
		const everyone = createMockRole({ name: "@everyone", position: 0 });
		const member = memberWith({ roles: { highest: everyone, cache: mockCollection([["0", everyone]]) } });

		const roles = userInfoEmbed(user(), member)
			.toJSON()
			.fields?.find((field) => field.name.startsWith("Roles"));
		expect(roles?.value).toBe("None");
	});

	it("shows a nickname when set, and None when not", () => {
		const named = memberWith({ nickname: "Ali" });
		const nickname = userInfoEmbed(user(), named)
			.toJSON()
			.fields?.find((field) => field.name === "Nickname");
		expect(nickname?.value).toBe("Ali");

		const plain = userInfoEmbed(user(), memberWith())
			.toJSON()
			.fields?.find((field) => field.name === "Nickname");
		expect(plain?.value).toBe("None");
	});

	it("reports boosting only when the member actually boosts", () => {
		const boosting = memberWith({ premiumSince: new Date(1_700_000_200_000) });
		const field = userInfoEmbed(user(), boosting)
			.toJSON()
			.fields?.find((f) => f.name === "Boosting since");
		expect(field?.value).toContain("<t:");

		const plain = userInfoEmbed(user(), memberWith())
			.toJSON()
			.fields?.find((f) => f.name === "Boosting since");
		expect(plain?.value).toBe("Not boosting");
	});

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
