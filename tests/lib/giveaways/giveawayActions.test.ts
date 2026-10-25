import { type Guild, type User } from "discord.js";
import { describeWithMongo } from "../../helpers/mongo";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { Giveaway } from "@database/models/giveaway.schema";
import { requireSendable } from "@lib/discord/channelPick.util";
import {
	deleteGiveaway,
	endGiveaway,
	listGiveaways,
	rerollGiveaway,
	startGiveaway,
} from "@lib/giveaways/giveawayActions.util";

const manager = {
	start: jest.fn(() => Promise.resolve()),
	end: jest.fn(() => Promise.resolve()),
	reroll: jest.fn(() => Promise.resolve()),
	delete: jest.fn(() => Promise.resolve()),
};

jest.mock("@lib/giveaways/giveaways.util", () => ({ giveaways: () => manager }));
jest.mock("@lib/discord/channelPick.util", () => ({ requireSendable: jest.fn(() => Promise.resolve()) }));

const GUILD = "900000000000000001";
const OTHER = "900000000000000002";
const CHANNEL = "400000000000000001";
const MESSAGE = "500000000000000001";

const client = {
	users: { cache: new Map([["100000000000000003", { tag: "winner#0001" }]]) },
} as unknown as TestifyClient;
const host = { id: "100000000000000002" } as User;

function guildWith(channel: unknown): Guild {
	return { id: GUILD, channels: { fetch: jest.fn(() => Promise.resolve(channel)) } } as unknown as Guild;
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("startGiveaway", () => {
	const draft = { channelId: CHANNEL, prize: "Nitro", winnerCount: 2, durationMs: 60_000, hostedBy: host };

	it("checks the bot can post there, then starts it with the shared wording", async () => {
		const channel = { isTextBased: () => true };

		await startGiveaway(client, guildWith(channel), draft);

		expect(requireSendable).toHaveBeenCalledWith(expect.objectContaining({ id: GUILD }), CHANNEL);
		expect(manager.start).toHaveBeenCalledWith(
			channel,
			expect.objectContaining({
				prize: "Nitro",
				winnerCount: 2,
				duration: 60_000,
				hostedBy: host,
				messages: expect.objectContaining({ winMessage: expect.stringContaining("{winners}") }),
			}),
		);
	});

	it("refuses a channel nothing can be posted in, before starting anything", async () => {
		await expect(startGiveaway(client, guildWith({ isTextBased: () => false }), draft)).rejects.toThrow(
			UserFacingError,
		);
		expect(manager.start).not.toHaveBeenCalled();
	});
});

describe("ending, rerolling and deleting", () => {
	it.each([
		["ends", endGiveaway, manager.end],
		["rerolls", rerollGiveaway, manager.reroll],
		["deletes", deleteGiveaway, manager.delete],
	])("%s by message id", async (_name, action, call) => {
		await action(client, MESSAGE);

		expect(call).toHaveBeenCalledWith(MESSAGE);
	});

	/** The library's own errors name its internals; the reader gets advice instead. */
	it.each([
		["end", endGiveaway, manager.end],
		["reroll", rerollGiveaway, manager.reroll],
		["delete", deleteGiveaway, manager.delete],
	])("turns a failed %s into advice", async (_name, action, call) => {
		call.mockImplementationOnce(() => Promise.reject(new Error("Unknown giveaway 500000000000000001")));

		await expect(action(client, MESSAGE)).rejects.toThrow(UserFacingError);
	});
});

describeWithMongo("listGiveaways", () => {
	const record = (messageId: string, guildId: string, startAt: number, extra: object = {}) => ({
		messageId,
		channelId: CHANNEL,
		guildId,
		startAt,
		endAt: startAt + 60_000,
		ended: false,
		winnerCount: 1,
		prize: `Prize ${messageId}`,
		...extra,
	});

	it("lists this server's giveaways newest first, and none of another's", async () => {
		await Giveaway.create([
			record("500000000000000001", GUILD, 1_000),
			record("500000000000000002", GUILD, 3_000),
			record("500000000000000003", OTHER, 2_000),
		]);

		const rows = await listGiveaways(client, GUILD);

		expect(rows.map((row) => row.messageId)).toEqual(["500000000000000002", "500000000000000001"]);
		expect(rows[0]).toMatchObject({ startAt: new Date(3_000).toISOString(), ended: false, hostedBy: null });
	});

	it("names the winners it can, and leaves the rest as ids", async () => {
		await Giveaway.create(record(MESSAGE, GUILD, 1_000, { ended: true, winnerIds: ["100000000000000003", "1234"] }));

		const [row] = await listGiveaways(client, GUILD);

		expect(row?.winners).toEqual([
			{ id: "100000000000000003", tag: "winner#0001" },
			{ id: "1234", tag: null },
		]);
	});
});
