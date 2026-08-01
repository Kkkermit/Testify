import { createApi } from "@api/server";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { forgetBotIdentity } from "@lib/botIdentity.util";
import { type BotIdentity } from "@testify/shared";
import { createMockClient } from "@tests/helpers/mocks";

jest.mock("@database/connection", () => ({ databaseConnected: jest.fn(() => true) }));

function clientWith(ready = true, overrides: Record<string, unknown> = {}): TestifyClient {
	return createMockClient({
		isReady: () => ready,
		user: {
			id: "100000000000000001",
			username: "Testify",
			displayAvatarURL: () => "https://cdn.discordapp.com/avatars/1/abc.png",
			bannerURL: () => null,
			accentColor: null,
			fetch: jest.fn().mockResolvedValue(undefined),
			...overrides,
		},
	} as never);
}

function apiFor(client: TestifyClient) {
	return createApi(client, { DASHBOARD_PORT: 3_000, DASHBOARD_BIND: "127.0.0.1" } as Env);
}

beforeEach(() => {
	forgetBotIdentity();
});

describe("the bot profile endpoint", () => {
	/** The sign-in screen needs it before there is a session, and it is public information regardless. */
	it("answers without a session", async () => {
		const response = await apiFor(clientWith()).request("/api/bot");
		const body = (await response.json()) as BotIdentity;

		expect(response.status).toBe(200);
		expect(body.username).toBe("Testify");
		expect(body.avatarUrl).toContain("cdn.discordapp.com");
	});

	it("says the bot is still connecting rather than failing", async () => {
		const response = await apiFor(clientWith(false)).request("/api/bot");

		expect(response.status).toBe(503);
		expect(((await response.json()) as { error: { code: string } }).error.code).toBe("bot_connecting");
	});

	/**
	 * Nothing here may leak beyond the public profile — this endpoint takes no session, so anything extra is
	 * readable by anyone who can reach the port.
	 */
	it("returns the public profile and nothing else", async () => {
		const body = (await (await apiFor(clientWith()).request("/api/bot")).json()) as Record<string, unknown>;

		expect(Object.keys(body).sort()).toEqual(["accentColour", "avatarUrl", "bannerUrl", "id", "username"]);
	});

	it("passes a banner through when the application has one", async () => {
		const client = clientWith(true, { bannerURL: () => "https://cdn.discordapp.com/banners/1/def.png" });
		const body = (await (await apiFor(client).request("/api/bot")).json()) as BotIdentity;

		expect(body.bannerUrl).toBe("https://cdn.discordapp.com/banners/1/def.png");
	});
});
