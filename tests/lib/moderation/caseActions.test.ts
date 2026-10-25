import { type Guild } from "discord.js";
import {
	createCase,
	findCase,
	getCaseSettings,
	listCases,
	nextCaseNumber,
	type StoredCase,
} from "@database/repositories/caseRepository";
import { listGuildWarnings } from "@database/repositories/moderationRepository";
import { canPostIn } from "@lib/discord/channels.util";
import { applyCaseSettings, readCase, readCases, recordCase } from "@lib/moderation/caseActions.util";

jest.mock("@database/repositories/caseRepository", () => ({
	createCase: jest.fn(),
	findCase: jest.fn(),
	getCaseSettings: jest.fn(() => Promise.resolve(null)),
	listCases: jest.fn(() => Promise.resolve([])),
	nextCaseNumber: jest.fn(() => Promise.resolve(4)),
	saveCaseSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock("@database/repositories/moderationRepository", () => ({
	listGuildWarnings: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@lib/discord/channels.util", () => ({ canPostIn: jest.fn(() => true) }));

const GUILD = "900000000000000001";
const SAM = "100000000000000001";
const MOD = { id: "100000000000000009", name: "mod" };

const stored = (number: number, overrides: Partial<StoredCase> = {}): StoredCase => ({
	guildId: GUILD,
	number,
	action: "warn",
	userId: SAM,
	username: "sam",
	moderatorId: MOD.id,
	moderatorName: MOD.name,
	reason: "spam",
	durationMs: null,
	createdAt: new Date(`2026-10-${String(10 + number).padStart(2, "0")}T12:00:00.000Z`),
	...overrides,
});

function guildWith(channel: unknown) {
	const logger = { warn: jest.fn(), error: jest.fn() };
	const guild = {
		id: GUILD,
		client: { logger },
		channels: { fetch: jest.fn(() => Promise.resolve(channel)) },
	} as unknown as Guild;
	return { guild, logger };
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(getCaseSettings).mockResolvedValue(null);
	jest.mocked(listCases).mockResolvedValue([]);
	jest.mocked(listGuildWarnings).mockResolvedValue([]);
	jest.mocked(canPostIn).mockReturnValue(true);
	jest
		.mocked(createCase)
		.mockImplementation((_guild, number, fields) =>
			Promise.resolve({ guildId: GUILD, number, ...fields, createdAt: new Date() }),
		);
});

describe("recordCase", () => {
	it("numbers the case and posts it to the log, pinging nobody", async () => {
		jest.mocked(getCaseSettings).mockResolvedValue({ logChannelId: "400000000000000001" });
		const send = jest.fn(() => Promise.resolve({}));
		const { guild } = guildWith({ isSendable: () => true, send });

		const recorded = await recordCase(guild, {
			action: "ban",
			user: { id: SAM, username: "sam" },
			moderator: MOD,
			reason: "raid",
		});

		expect(recorded).toEqual(expect.objectContaining({ number: 4, action: "ban", userId: SAM, moderatorId: MOD.id }));
		expect(send).toHaveBeenCalledWith(expect.objectContaining({ allowedMentions: { parse: [] } }));
		expect(JSON.stringify(send.mock.calls[0])).toContain("Case 4");
	});

	it("records without posting when there is no log channel", async () => {
		const { guild } = guildWith(null);

		await expect(
			recordCase(guild, { action: "warn", user: { id: SAM, username: "sam" }, moderator: MOD, reason: "x" }),
		).resolves.toEqual(expect.objectContaining({ number: 4 }));
		expect(guild.channels.fetch).not.toHaveBeenCalled();
	});

	/** The action it records has already happened, so a failing record must not fail the command. */
	it("logs rather than throws when the case cannot be written, or posted", async () => {
		const { guild, logger } = guildWith(null);
		jest.mocked(nextCaseNumber).mockRejectedValueOnce(new Error("database down"));

		await expect(
			recordCase(guild, { action: "kick", user: { id: SAM, username: "sam" }, moderator: MOD, reason: "x" }),
		).resolves.toBeNull();
		expect(logger.error).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("[CASES]"));

		jest.mocked(getCaseSettings).mockResolvedValue({ logChannelId: "400000000000000001" });
		const failing = guildWith({ isSendable: () => true, send: () => Promise.reject(new Error("Missing Access")) });
		await expect(
			recordCase(failing.guild, { action: "kick", user: { id: SAM, username: "sam" }, moderator: MOD, reason: "x" }),
		).resolves.toEqual(expect.objectContaining({ number: 4 }));
		expect(failing.logger.warn).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("[CASES]"));
	});
});

describe("readCases", () => {
	/** The migration on read: a warning from before cases is listed, unnumbered, rather than rewritten. */
	it("lists the warnings from before cases beside the cases, newest first", async () => {
		jest.mocked(listCases).mockResolvedValue([stored(2, { action: "ban" }), stored(1)]);
		jest.mocked(listGuildWarnings).mockResolvedValue([
			{
				guildId: GUILD,
				userId: SAM,
				userTag: "sam",
				warnings: [
					{
						warnId: "old",
						executorId: MOD.id,
						executorTag: "mod",
						reason: "old one",
						timestamp: new Date("2026-01-01"),
						edits: [],
					},
					{
						warnId: "new",
						executorId: MOD.id,
						executorTag: "mod",
						reason: "spam",
						timestamp: new Date(),
						edits: [],
						caseNumber: 1,
					},
				],
			},
		] as never);

		const page = await readCases(GUILD);

		expect(page.items.map((entry) => entry.number)).toEqual([2, 1, null]);
		expect(page.items[2]).toEqual(expect.objectContaining({ action: "warn", reason: "old one", moderatorName: "mod" }));
	});

	it("finds a case by number, by member id or mention, or by a word in it, and by what was done", async () => {
		jest
			.mocked(listCases)
			.mockResolvedValue([
				stored(3, { action: "kick", reason: "raiding", username: "kit", userId: "100000000000000002" }),
				stored(2, { action: "ban" }),
				stored(1),
			]);

		expect((await readCases(GUILD, { query: "#2" })).items.map((entry) => entry.number)).toEqual([2]);
		expect((await readCases(GUILD, { query: "<@100000000000000002>" })).items.map((entry) => entry.number)).toEqual([
			3,
		]);
		expect((await readCases(GUILD, { query: "RAID" })).items.map((entry) => entry.number)).toEqual([3]);
		expect((await readCases(GUILD, { action: "warn" })).items.map((entry) => entry.number)).toEqual([1]);
	});

	it("pages, and keeps a page past the end on the last one", async () => {
		jest.mocked(listCases).mockResolvedValue(Array.from({ length: 12 }, (_, index) => stored(12 - index)));

		const last = await readCases(GUILD, { page: 9, perPage: 5 });

		expect(last).toEqual(expect.objectContaining({ page: 3, total: 12, perPage: 5 }));
		expect(last.items).toHaveLength(2);
	});
});

describe("readCase and applyCaseSettings", () => {
	it("says when there is no such case", async () => {
		jest.mocked(findCase).mockResolvedValue(null);

		await expect(readCase(GUILD, 99)).rejects.toThrow("There is no case 99 in this server.");
	});

	it("refuses a log channel the bot cannot post in", async () => {
		jest.mocked(canPostIn).mockReturnValue(false);

		await expect(applyCaseSettings({ id: GUILD } as Guild, "400000000000000001", SAM)).rejects.toThrow(/cannot post/);
	});
});
