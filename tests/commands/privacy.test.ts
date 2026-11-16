import { type Shardlens } from "@shardlens/discordjs";
import privacy, { privacyEmbed } from "@commands/info/privacy.command";
import { type Env } from "@config/env";
import { type TestifyClient } from "@core/client";
import { isAlwaysEnabled } from "@testify/shared";
import { createMockClient, createMockInteraction, createMockUser } from "@tests/helpers/mocks";

const USER = "111111111111111111";

const mockStored = new Set<string>();
let mockSaveFails = false;
jest.mock("@database/repositories/analyticsOptOutRepository", () => ({
	isOptedOut: jest.fn(async (userId: string) => Promise.resolve(mockStored.has(userId))),
	saveOptOut: jest.fn(async (userId: string, optedOut: boolean) => {
		if (mockSaveFails) throw new Error("database down");
		if (optedOut) mockStored.add(userId);
		else mockStored.delete(userId);
		return Promise.resolve();
	}),
}));

interface FakeLens {
	optOut: jest.Mock;
	optIn: jest.Mock;
	forgetUser: jest.Mock;
	stats: jest.Mock;
}

function lensWith(mode: "audit" | "privacy" | undefined, erased: { erased: number } | null = { erased: 4 }): FakeLens {
	return {
		optOut: jest.fn(),
		optIn: jest.fn(),
		forgetUser: jest.fn(async () => Promise.resolve(erased ?? undefined)),
		stats: jest.fn(() => ({ mode })),
	};
}

function clientWith(lens: FakeLens | null, env: Partial<Env> = {}): TestifyClient {
	const client = createMockClient({ env: { DASHBOARD_ENABLED: false, SITE_ENABLED: false, ...env } } as never);
	client.shardlens = lens as unknown as Shardlens | null;
	return client;
}

async function run(subcommand: string, client: TestifyClient): Promise<string> {
	const interaction = createMockInteraction({ subcommand, overrides: { user: createMockUser({ id: USER }) } });
	await privacy.subcommands?.find((sub) => sub.name === subcommand)?.run(interaction, client);
	return JSON.stringify(interaction.sent);
}

beforeEach(() => {
	mockStored.clear();
	mockSaveFails = false;
});

describe("/privacy", () => {
	/** Nobody may be kept from opting out by a server switching the command off, and the answer is theirs alone. */
	it("can never be switched off, and answers only the person who ran it", () => {
		expect(isAlwaysEnabled("privacy")).toBe(true);
		expect(privacy.private).toBe(true);
	});

	/** An opt-out held only in memory was forgotten at the next start, and the person counted again. */
	it("stores an opt-out and stops Shardlens counting them at once", async () => {
		const lens = lensWith("audit");

		const said = await run("opt-out", clientWith(lens));

		expect(mockStored.has(USER)).toBe(true);
		expect(lens.optOut).toHaveBeenCalledWith(USER);
		expect(said).toContain("/privacy opt-in");
	});

	/** A choice that could not be kept must never be shown as made, or the person believes they are not counted. */
	it("tells Shardlens nothing when the choice cannot be stored", async () => {
		mockSaveFails = true;
		const lens = lensWith("audit");

		await expect(run("opt-out", clientWith(lens))).rejects.toThrow("database down");
		expect(lens.optOut).not.toHaveBeenCalled();
	});

	it("keeps the choice while analytics are off, for when they are turned on", async () => {
		await run("opt-out", clientWith(null));

		expect(mockStored.has(USER)).toBe(true);
	});

	it("counts them again once they opt back in", async () => {
		mockStored.add(USER);
		const lens = lensWith("audit");

		await run("opt-in", clientWith(lens));

		expect(mockStored.has(USER)).toBe(false);
		expect(lens.optIn).toHaveBeenCalledWith(USER);
	});

	/** `forgetUser` does not opt anybody out, so erasing without it would start counting them again at once. */
	it("erases what the collector holds and opts them out, and says when the collector could not be reached", async () => {
		const lens = lensWith("audit");
		expect(await run("erase", clientWith(lens))).toContain("Deleted what the usage analytics held about you");
		expect(lens.forgetUser).toHaveBeenCalledWith(USER);
		expect(lens.optOut).toHaveBeenCalledWith(USER);
		expect(mockStored.has(USER)).toBe(true);

		expect(await run("erase", clientWith(lensWith("audit", null)))).toContain("couldn't be reached");
		expect(await run("erase", clientWith(null))).toContain("nothing to delete");
	});

	it("says what is sent, in the mode the collector actually agreed to", () => {
		const text = (sending: "off" | "identified" | "hashed", optedOut = false): string =>
			JSON.stringify(privacyEmbed({ sending, optedOut }, null).toJSON());

		expect(text("identified")).toContain("user ID, username and picture");
		expect(text("hashed")).toContain("a code that changes regularly");
		expect(text("hashed")).not.toContain("username");
		expect(text("off")).toContain("isn't sending usage analytics anywhere");
		expect(text("hashed", true)).toContain("opted out");
		expect(text("hashed")).toContain("/delete-my-data");
	});

	/** Until the collector is in audit mode too the SDK hashes everybody, so naming them would be untrue. */
	it("reads the mode from the SDK rather than from the bot's own request", async () => {
		expect(await run("info", clientWith(lensWith(undefined)))).toContain("a code that changes regularly");
		expect(await run("info", clientWith(lensWith("audit")))).toContain("username and picture");
	});

	it("links the privacy notice only where the website serves it", async () => {
		const site = { SITE_ENABLED: true, DASHBOARD_BASE_URL: "https://testify.example.com/" };

		expect(await run("info", clientWith(null, site))).toContain("https://testify.example.com/privacy");
		expect(await run("info", clientWith(null))).not.toContain('/privacy"');
	});
});
