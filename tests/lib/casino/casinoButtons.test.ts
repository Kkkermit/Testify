import casino from "@buttons/casino";
import casinoSettings from "@buttons/casinoSettings";
import { checkCasinoPlay } from "@core/checks";
import type * as Casino from "@lib/casino";
import { normaliseCasinoSettings } from "@lib/casino/casinoSettings.util";
import { decodeSpots, encodeSpots } from "@lib/casino/roulette.util";

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
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(() => Promise.resolve({ wallet: 1_000 })),
}));

const { readCasinoSettings, applyCasinoSettings, playInstant, playBlackjack, startBlackjack } =
	jest.requireMock("@lib/casino");

const OWNER = "100000000000000001";
const GUILD = "900000000000000001";

function pressed(options: { manager?: boolean; modal?: Record<string, string>; values?: string[] } = {}) {
	return {
		guildId: GUILD,
		channelId: "400000000000000001",
		message: { id: "500000000000000009" },
		values: options.values ?? [],
		user: { id: OWNER },
		memberPermissions: { has: () => options.manager !== false },
		isButton: () => options.modal === undefined && options.values === undefined,
		isStringSelectMenu: () => options.values !== undefined,
		isModalSubmit: () => options.modal !== undefined,
		isFromMessage: () => true,
		fields: { getTextInputValue: (id: string) => options.modal?.[id] ?? "" },
		update: jest.fn((_payload?: unknown) => Promise.resolve()),
		deferUpdate: jest.fn(() => Promise.resolve()),
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

	/** Play again edits the message it sits on, rather than stacking a new game under the old one. */
	it("replays an instant game for the same stake, on the same message", async () => {
		const interaction = pressed();
		await run(interaction, "again", ["dice", "over", "250"]);

		expect(interaction.deferUpdate).toHaveBeenCalled();
		expect(interaction.reply).not.toHaveBeenCalled();
		expect(playInstant).toHaveBeenCalledWith(
			interaction,
			client,
			{ guildId: GUILD, userId: OWNER },
			"250",
			expect.any(Function),
		);
	});

	it("deals a new blackjack hand on the same message and remembers it there", async () => {
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

		expect(interaction.update).toHaveBeenCalled();
		expect(interaction.reply).not.toHaveBeenCalled();
		expect(jest.requireMock("@database/repositories/casinoRepository").attachHandMessage).toHaveBeenCalledWith(
			{ _id: "hand" },
			"400000000000000001",
			"500000000000000009",
		);
	});

	it("ignores a game the button could not have named", async () => {
		await run(pressed(), "again", ["poker", "x", "100"]);

		expect(playInstant).not.toHaveBeenCalled();
		expect(checkCasinoPlay).not.toHaveBeenCalled();
	});
});

describe("the roulette table", () => {
	const run = (interaction: ReturnType<typeof pressed>, action: string, args: string[] = []) =>
		casino.run(interaction as never, { client, action, args: [...args, OWNER] });
	const n = (number: number) => ({ kind: "number" as const, number });

	function tableShown(interaction: ReturnType<typeof pressed>): string {
		return JSON.stringify(interaction.update.mock.calls[0]?.[0]);
	}

	/** Play again reopens the table with the last bets on it, so the player can change them before spinning. */
	it("reopens the table from Play again with the same chips, without spinning", async () => {
		const interaction = pressed();
		await run(interaction, "again", ["roulette", `t${encodeSpots([n(17), { kind: "red" }])}`, "100"]);

		expect(playInstant).not.toHaveBeenCalled();
		expect(interaction.update).toHaveBeenCalled();
		expect(tableShown(interaction)).toContain("Spin · 200");
	});

	it("changes only the part of the table its menu covers", async () => {
		const interaction = pressed({ values: ["n5", "n6"] });
		await run(interaction, "rt-pick", ["a", encodeSpots([n(17), n(30), { kind: "red" }]), "10"]);

		// 17 was in this menu and is gone; 30 and red sit in other menus and stay.
		const spin = /rt-spin:([0-9a-z]+):10/.exec(tableShown(interaction));
		expect(decodeSpots(spin?.[1] ?? "")).toEqual([n(5), n(6), n(30), { kind: "red" }]);
	});

	it("will not let one menu place a spot from another", async () => {
		const interaction = pressed({ values: ["n30", "red"] });
		await run(interaction, "rt-pick", ["a", encodeSpots([]), "10"]);

		expect(tableShown(interaction)).toContain("Pick where to put your chips");
	});

	it("spins for a chip on every spot, on the same message", async () => {
		const interaction = pressed();
		await run(interaction, "rt-spin", [encodeSpots([n(1), n(2), { kind: "odd" }]), "50"]);

		expect(interaction.deferUpdate).toHaveBeenCalled();
		expect(playInstant).toHaveBeenCalledWith(
			interaction,
			client,
			{ guildId: GUILD, userId: OWNER },
			"150",
			expect.any(Function),
		);
	});

	it("refuses to spin an empty table or while the casino is closed", async () => {
		await expect(run(pressed(), "rt-spin", ["0", "50"])).rejects.toThrow(/chip on the table/);

		jest.mocked(checkCasinoPlay).mockResolvedValueOnce("The casino is closed in this server.");
		await expect(run(pressed(), "rt-spin", [encodeSpots([n(1)]), "50"])).rejects.toThrow(/closed/);
		expect(playInstant).not.toHaveBeenCalled();
	});

	it("refuses a button whose layout or chip it cannot read", async () => {
		await expect(run(pressed(), "rt-spin", ["NOPE", "50"])).rejects.toThrow(/no longer knows/);
		await expect(run(pressed(), "rt-spin", [encodeSpots([n(1)]), "-5"])).rejects.toThrow(/no longer knows/);
	});

	it("changes the chip from the form, keeping the spots, and accepts half or all", async () => {
		const interaction = pressed({ modal: { chip: "half" } });
		await run(interaction, "rt-chipset", [encodeSpots([n(7)])]);

		expect(tableShown(interaction)).toContain("Each chip is now 500.");
		expect(tableShown(interaction)).toContain("Spin · 500");
	});

	it("clears the table but keeps the chip", async () => {
		const interaction = pressed();
		await run(interaction, "rt-clear", ["75"]);

		expect(tableShown(interaction)).toContain("Chip **75** a spot");
	});
});
