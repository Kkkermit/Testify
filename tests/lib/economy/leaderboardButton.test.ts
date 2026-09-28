import { Collection } from "discord.js";
import leaderboard from "@buttons/leaderboard";
import type * as Economy from "@lib/economy";

jest.mock("@lib/economy", () => ({
	...jest.requireActual<typeof Economy>("@lib/economy"),
	boardMessage: jest.fn(() => Promise.resolve({ files: ["picture"], components: ["buttons"] })),
}));

const { boardMessage } = jest.requireMock<{ boardMessage: jest.Mock }>("@lib/economy");

const OWNER = "100000000000000001";
const GUILD = { id: "900000000000000001", name: "Testify HQ" };

function pressed() {
	return {
		guild: GUILD,
		user: { id: OWNER },
		isButton: () => true,
		deferUpdate: jest.fn(() => Promise.resolve()),
		editReply: jest.fn(() => Promise.resolve()),
	};
}

const client = { guilds: { cache: new Collection([[GUILD.id, GUILD]]) } } as never;

beforeEach(() => {
	jest.clearAllMocks();
});

describe("the leaderboard buttons", () => {
	/** The servers to add up come from the bot, never from anything a button carries. */
	it("redraws the money board it names, over the bot's own servers", async () => {
		const interaction = pressed();
		await leaderboard.run(interaction as never, { client, action: "scope", args: ["wallet", "global", OWNER] });

		expect(interaction.deferUpdate).toHaveBeenCalled();
		expect(boardMessage).toHaveBeenCalledWith(GUILD, { kind: "economy", sort: "wallet", scope: "global" }, OWNER, [
			GUILD.id,
		]);
	});

	/** Without the empty list the edit kept the old picture and stacked the new one under it. */
	it("replaces the picture rather than adding another", async () => {
		const interaction = pressed();
		await leaderboard.run(interaction as never, { client, action: "sort", args: ["total", "server", OWNER] });

		expect(interaction.editReply).toHaveBeenCalledWith({
			files: ["picture"],
			components: ["buttons"],
			attachments: [],
		});
	});

	it("ignores a button carrying a board that does not exist", async () => {
		const interaction = pressed();
		await leaderboard.run(interaction as never, { client, action: "sort", args: ["pets", "server", OWNER] });

		expect(interaction.deferUpdate).not.toHaveBeenCalled();
		expect(boardMessage).not.toHaveBeenCalled();
	});

	/** The router compares the last argument with whoever pressed, so only the person who asked can switch it. */
	it("belongs to whoever asked for the board", () => {
		expect(leaderboard.ownerOnly).toBe(true);
	});
});
