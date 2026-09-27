import { theme } from "@config/theme";
import { nameBot } from "@core/brand";
import { type TestifyClient } from "@core/client";
import { botIdentity, forgetBotIdentity, identityOf } from "@lib/bot/botIdentity.util";
import { createMockClient } from "@tests/helpers/mocks";

function userLike(overrides: Record<string, unknown> = {}) {
	return {
		id: "100000000000000001",
		username: "Testify",
		displayAvatarURL: () => "https://cdn.discordapp.com/avatars/1/abc.png",
		bannerURL: () => "https://cdn.discordapp.com/banners/1/def.png",
		accentColor: 0x7c3aed,
		fetch: jest.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

function clientWith(user: ReturnType<typeof userLike>, ready = true): TestifyClient {
	return createMockClient({ isReady: () => ready, user } as never);
}

beforeEach(() => {
	forgetBotIdentity();
});

describe("identityOf", () => {
	it("reads the profile Discord gives it", () => {
		expect(identityOf(userLike() as never)).toEqual({
			id: "100000000000000001",
			name: "Testify",
			username: "Testify",
			avatarUrl: "https://cdn.discordapp.com/avatars/1/abc.png",
			bannerUrl: "https://cdn.discordapp.com/banners/1/def.png",
			accentColour: "#7c3aed",
			supportUrl: theme.supportServer,
			repositoryUrl: theme.repository,
		});
	});

	it("names the bot by its Discord username", () => {
		nameBot(() => "helper-app");
		const identity = identityOf(userLike({ username: "helper-app" }) as never);
		nameBot(() => undefined);

		expect(identity).toMatchObject({ name: "helper-app", username: "helper-app" });
	});

	/** Most applications have neither, so the empty case is the common one rather than the exception. */
	it("reports no banner and no accent rather than undefined", () => {
		const identity = identityOf(userLike({ bannerURL: () => null, accentColor: null }) as never);

		expect(identity.bannerUrl).toBeNull();
		expect(identity.accentColour).toBeNull();
	});

	/** `bannerURL` returns undefined — not null — until the user has been fetched over REST. */
	it("treats an unfetched banner as absent", () => {
		expect(identityOf(userLike({ bannerURL: () => undefined }) as never).bannerUrl).toBeNull();
	});

	it("pads a short accent colour, or the hex is not a hex", () => {
		expect(identityOf(userLike({ accentColor: 0x0000ff }) as never).accentColour).toBe("#0000ff");
	});
});

describe("botIdentity", () => {
	function connectingClient(get: jest.Mock): TestifyClient {
		const client = createMockClient({
			isReady: () => false,
			rest: {
				get,
				cdn: {
					avatar: (id: string, hash: string) => `https://cdn.discordapp.com/avatars/${id}/${hash}.png`,
					defaultAvatar: (index: number) => `https://cdn.discordapp.com/embed/avatars/${String(index)}.png`,
					banner: (id: string, hash: string) => `https://cdn.discordapp.com/banners/${id}/${hash}.png`,
				},
			},
		} as never);
		nameBot(() => client.restName);
		return client;
	}

	afterEach(() => {
		nameBot(() => undefined);
	});

	/** The sign-in screen showed the built-in name for as long as the gateway took to connect. */
	it("reads the bot's own profile over REST while the gateway is still connecting", async () => {
		const get = jest.fn().mockResolvedValue({
			id: "100000000000000001",
			username: "helper-app",
			avatar: null,
			banner: null,
			accent_color: null,
		});

		const identity = await botIdentity(connectingClient(get));

		expect(identity).toMatchObject({ name: "helper-app", username: "helper-app", bannerUrl: null });
		expect(identity?.avatarUrl).toMatch(/embed\/avatars\/\d\.png$/);
	});

	it("reads it once for a burst of polls, not once per poll", async () => {
		const get = jest.fn().mockResolvedValue({ id: "100000000000000001", username: "helper-app", avatar: "abc" });
		const client = connectingClient(get);

		await botIdentity(client, 0);
		await botIdentity(client, 2_000);

		expect(get).toHaveBeenCalledTimes(1);
	});

	it("says nothing when even the REST read fails, so the page keeps waiting", async () => {
		await expect(botIdentity(connectingClient(jest.fn().mockRejectedValue(new Error("401"))), 0)).resolves.toBeNull();
	});

	/** The banner never arrives in the READY payload, so without this fetch it is permanently absent. */
	it("fetches the user, which is the only way to get a banner", async () => {
		const user = userLike();
		await botIdentity(clientWith(user));

		expect(user.fetch).toHaveBeenCalled();
	});

	it("serves the cached answer rather than fetching per request", async () => {
		const user = userLike();
		const client = clientWith(user);

		await botIdentity(client, 0);
		await botIdentity(client, 1_000);
		await botIdentity(client, 60_000);

		expect(user.fetch).toHaveBeenCalledTimes(1);
	});

	it("refetches once the cache is stale, so a rebrand appears", async () => {
		const user = userLike();
		const client = clientWith(user);

		await botIdentity(client, 0);
		await botIdentity(client, 60 * 60 * 1000 + 1);

		expect(user.fetch).toHaveBeenCalledTimes(2);
	});

	/** A rate-limited REST call must not cost the dashboard its avatar as well as its banner. */
	it("still returns the cached profile when the fetch fails", async () => {
		const user = userLike({ fetch: jest.fn().mockRejectedValue(new Error("429")), bannerURL: () => undefined });
		const identity = await botIdentity(clientWith(user));

		expect(identity?.avatarUrl).toContain("cdn.discordapp.com");
		expect(identity?.bannerUrl).toBeNull();
	});
});
