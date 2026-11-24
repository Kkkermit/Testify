import { type Guild, type User } from "discord.js";
import { describeWithMongo } from "../../helpers/mongo";
import { type TestifyClient } from "@core/client";
import { UserFacingError } from "@core/errors";
import { Giveaway } from "@database/models/giveaway.schema";
import {
	deleteGiveaway,
	endGiveaway,
	listGiveaways,
	rerollGiveaway,
	startGiveaway,
} from "@lib/giveaways/giveawayActions.util";

const manager = {
	giveaways: [] as { messageId: string; guildId: string }[],
	start: jest.fn(() => Promise.resolve()),
	end: jest.fn((_messageId: string) => Promise.resolve()),
	reroll: jest.fn((_messageId: string) => Promise.resolve()),
	delete: jest.fn((_messageId: string) => Promise.resolve()),
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

	it("refuses a channel nothing can be posted in, before starting anything", async () => {
		await expect(startGiveaway(client, guildWith({ isTextBased: () => false }), draft)).rejects.toThrow(
			UserFacingError,
		);
		expect(manager.start).not.toHaveBeenCalled();
	});
});

describe("ending, rerolling and deleting", () => {
	const actions = [
		["end", endGiveaway, manager.end],
		["reroll", rerollGiveaway, manager.reroll],
		["delete", deleteGiveaway, manager.delete],
	] as const;

	beforeEach(() => {
		manager.giveaways = [{ messageId: MESSAGE, guildId: GUILD }];
	});

	it("acts on this server's giveaway by its message id", async () => {
		for (const [, action] of actions) await action(client, GUILD, MESSAGE);

		expect(actions.filter(([, , call]) => call.mock.calls[0]?.[0] !== MESSAGE).map(([name]) => name)).toEqual([]);
	});

	/** `/giveaway end` in one server ended another server's giveaway, because the library looks a message up anywhere. */
	it("refuses a giveaway that belongs to another server, before the library is asked", async () => {
		const reached: string[] = [];
		for (const [name, action] of actions) {
			await expect(action(client, OTHER, MESSAGE)).rejects.toThrow(UserFacingError);
			if (manager[name].mock.calls.length > 0) reached.push(name);
		}

		expect(reached).toEqual([]);
	});

	/** The library's own errors name its internals; the reader gets advice instead. */
	it("turns a failure from the library into advice", async () => {
		const leaked: string[] = [];
		for (const [name, action, call] of actions) {
			call.mockImplementationOnce(() => Promise.reject(new Error("Unknown giveaway 500000000000000001")));
			const error = await action(client, GUILD, MESSAGE).catch((caught: unknown) => caught);
			if (!(error instanceof UserFacingError) || error.message.includes(MESSAGE)) leaked.push(name);
		}

		expect(leaked).toEqual([]);
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
