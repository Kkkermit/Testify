import casino from "@buttons/casino";
import casinoSettings from "@buttons/casinoSettings";
import { checkCasinoPlay } from "@core/checks";
import type * as Casino from "@lib/casino";
import { normaliseCasinoSettings } from "@lib/casino/casinoSettings.util";

jest.mock("@lib/casino", () => ({
	...jest.requireActual<typeof Casino>("@lib/casino"),
	readCasinoSettings: jest.fn(),
	applyCasinoSettings: jest.fn(),
	playInstant: jest.fn(() => Promise.resolve()),
	playBlackjack: jest.fn(),
	callHiLo: jest.fn(),
	cashOutHiLo: jest.fn(),
	startBlackjack: jest.fn(),
}));
jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkCasinoPlay: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/casinoRepository", () => ({ attachHandMessage: jest.fn() }));

const { readCasinoSettings, applyCasinoSettings, playInstant, playBlackjack, startBlackjack } =
	jest.requireMock("@lib/casino");

const OWNER = "100000000000000001";
const GUILD = "900000000000000001";

function pressed(options: { manager?: boolean; modal?: Record<string, string> } = {}) {
	return {
		guildId: GUILD,
		channelId: "400000000000000001",
		user: { id: OWNER },
		memberPermissions: { has: () => options.manager !== false },
		isButton: () => options.modal === undefined,
		isModalSubmit: () => options.modal !== undefined,
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => options.modal?.[id] ?? "" },
		update: jest.fn(() => Promise.resolve()),
		reply: jest.fn(() => Promise.resolve()),
		showModal: jest.fn(() => Promise.resolve()),
		fetchReply: jest.fn(() => Promise.resolve({ id: "500000000000000001" })),
	};
}

const client = {} as never;

beforeEach(() => {
	jest.clearAllMocks();
	readCasinoSettings.mockResolvedValue(normaliseCasinoSettings(null));
	applyCasinoSettings.mockImplementation((_guild: string, patch: object) =>
		Promise.resolve({ settings: { ...normaliseCasinoSettings(null), ...patch } }),
	);
});

describe("the casino settings panel", () => {
	const run = (interaction: ReturnType<typeof pressed>, action: string, args: string[] = []) =>
		casinoSettings.run(interaction as never, { client, action, args: [...args, OWNER] });

	/** The panel outlives the permission it was opened with. */
	it("refuses somebody who has lost Manage Server since opening it", async () => {
		await expect(run(pressed({ manager: false }), "close")).rejects.toThrow(/Manage Server/);
		expect(applyCasinoSettings).not.toHaveBeenCalled();
	});

	it("closes the casino", async () => {
		const interaction = pressed();
		await run(interaction, "close");

		expect(applyCasinoSettings).toHaveBeenCalledWith(GUILD, { enabled: false }, OWNER);
		expect(interaction.update).toHaveBeenCalled();
	});

	it("flips one game and leaves the others", async () => {
		await run(pressed(), "game", ["slots"]);

		expect(applyCasinoSettings).toHaveBeenCalledWith(GUILD, { games: { slots: false } }, OWNER);
	});

	it("ignores a game no button offers", async () => {
		await run(pressed(), "game", ["poker"]);

		expect(applyCasinoSettings).not.toHaveBeenCalled();
	});

	it("opens the limits form filled with the current limits", async () => {
		const interaction = pressed();
		await run(interaction, "limits");

		expect(interaction.showModal).toHaveBeenCalled();
	});

	it("saves limits from the form", async () => {
		await run(pressed({ modal: { min: "50", max: "" } }), "save-limits");

		expect(applyCasinoSettings).toHaveBeenCalledWith(GUILD, { minBet: 50, maxBet: null }, OWNER);
	});

	it("says what was wrong with the form, and saves nothing", async () => {
		const interaction = pressed({ modal: { min: "nope", max: "" } });
		await run(interaction, "save-limits");

		expect(interaction.reply).toHaveBeenCalled();
		expect(applyCasinoSettings).not.toHaveBeenCalled();
	});

	it("reports a pair the rules refuse", async () => {
		applyCasinoSettings.mockResolvedValue({ problem: "The smallest bet cannot be more than the largest." });
		const interaction = pressed({ modal: { min: "500", max: "100" } });
		await run(interaction, "save-limits");

		expect(interaction.reply).toHaveBeenCalled();
		expect(interaction.update).not.toHaveBeenCalled();
	});
});

describe("the casino's game buttons", () => {
	const run = (interaction: ReturnType<typeof pressed>, action: string, args: string[] = []) =>
		casino.run(interaction as never, { client, action, args: [...args, OWNER] });

	it("plays a blackjack decision and redraws the table", async () => {
		playBlackjack.mockResolvedValue({
			state: { player: [], dealer: [], deck: [], doubled: false },
			bet: 100,
			staked: 100,
			verdict: null,
			returned: 0,
			wallet: null,
		});
		const interaction = pressed();

		await run(interaction, "bj-stand");

		expect(playBlackjack).toHaveBeenCalledWith({ guildId: GUILD, userId: OWNER }, "stand");
		expect(interaction.update).toHaveBeenCalled();
	});

	/** Play again deals a new game, so it has to pass the gates the command does, not only the old message's. */
	it("refuses Play again while the casino is closed", async () => {
		jest.mocked(checkCasinoPlay).mockResolvedValueOnce("The casino is closed in this server.");

		await expect(run(pressed(), "again", ["slots", "line", "100"])).rejects.toThrow(/closed/);
		expect(playInstant).not.toHaveBeenCalled();
	});

	it("replays an instant game for the same stake", async () => {
		await run(pressed(), "again", ["dice", "over", "250"]);

		expect(playInstant).toHaveBeenCalledWith(
			expect.anything(),
			client,
			{ guildId: GUILD, userId: OWNER },
			"250",
			expect.any(Function),
		);
	});

	it("deals a new blackjack hand and remembers where it is showing", async () => {
		startBlackjack.mockResolvedValue({
			hand: { _id: "hand" },
			view: {
				state: { player: [], dealer: [], deck: [], doubled: false },
				bet: 100,
				staked: 100,
				verdict: null,
				returned: 0,
				wallet: null,
			},
		});
		const interaction = pressed();

		await run(interaction, "again", ["blackjack", "deal", "100"]);

		expect(interaction.reply).toHaveBeenCalled();
		expect(jest.requireMock("@database/repositories/casinoRepository").attachHandMessage).toHaveBeenCalledWith(
			{ _id: "hand" },
			"400000000000000001",
			"500000000000000001",
		);
	});

	it("ignores a game the button could not have named", async () => {
		await run(pressed(), "again", ["poker", "x", "100"]);

		expect(playInstant).not.toHaveBeenCalled();
		expect(checkCasinoPlay).not.toHaveBeenCalled();
	});
});
