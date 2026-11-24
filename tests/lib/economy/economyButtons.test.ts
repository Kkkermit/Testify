import { PermissionFlagsBits, PermissionsBitField } from "discord.js";
import heist from "@buttons/heist";
import reset from "@buttons/reset";
import shop from "@buttons/shop";
import { checkOpenControl } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { activeHeists } from "@lib/economy/heistState.util";
import { createMockClient, createMockGuild, USER_ID } from "@tests/helpers/mocks";

jest.mock("@core/checks", () => ({
	...jest.requireActual<object>("@core/checks"),
	checkOpenControl: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(),
	findAccount: jest.fn(() => Promise.resolve({ wallet: 1_000, lastHeist: null })),
	debitWallet: jest.fn(() => Promise.resolve({ wallet: 0 })),
	adjustWallet: jest.fn(() => Promise.resolve({ wallet: 0 })),
	fillSlot: jest.fn(() => Promise.resolve(false)),
	emptySlot: jest.fn(() => Promise.resolve(false)),
	addBusiness: jest.fn(() => Promise.resolve(false)),
	addInventoryItem: jest.fn(),
	setFields: jest.fn(),
	setCooldown: jest.fn(() => Promise.resolve()),
	incrementCounters: jest.fn(() => Promise.resolve()),
	resetGuild: jest.fn(() => Promise.resolve(3)),
}));
jest.mock("@database/repositories/levelRepository", () => ({ resetGuildLevels: jest.fn(() => Promise.resolve(3)) }));
jest.mock("@lib/economy/shopRoles.util", () => ({
	...jest.requireActual<object>("@lib/economy/shopRoles.util"),
	rolesForSale: jest.fn(() => Promise.resolve([])),
}));

const repository = jest.requireMock("@database/repositories/economyRepository");

const GUILD = "400000000000000004";
const ACCOUNT = {
	wallet: 10_000_000,
	bank: 0,
	job: "Unemployed",
	inventory: [],
	businesses: [],
	house: null,
	pet: null,
};

function pressed(overrides: object = {}) {
	return {
		guild: createMockGuild(),
		guildId: GUILD,
		user: { id: USER_ID },
		memberPermissions: new PermissionsBitField([PermissionFlagsBits.Administrator]),
		isStringSelectMenu: () => false,
		isButton: () => true,
		update: jest.fn(() => Promise.resolve()),
		followUp: jest.fn(() => Promise.resolve()),
		...overrides,
	};
}

function shopPress(action: string, section: string, selectedId: string): Promise<void> {
	return shop.run(pressed() as never, {
		client: createMockClient(),
		action,
		args: [section, "-", selectedId, "0", "-", USER_ID],
	});
}

function formingHeist(): void {
	activeHeists().set(GUILD, {
		guildId: GUILD,
		leaderId: USER_ID,
		stake: 500,
		participants: new Set([USER_ID, "300000000000000003"]),
		startedAt: Date.now(),
		messageId: null,
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	activeHeists().clear();
});

describe("the shop", () => {
	/** A second purchase landing first meant this one was charged for something it never got. */
	it("gives the price back when the slot was filled or the business bought while the purchase was on its way", async () => {
		repository.requireAccount.mockResolvedValue(ACCOUNT);
		const buys: [section: string, id: string][] = [
			["houses", "small_apartment"],
			["businesses", "coffee_shop"],
			["pets", "hamster"],
		];

		const kept: string[] = [];
		for (const [section, id] of buys) {
			await expect(shopPress("buy", section, id)).rejects.toBeInstanceOf(UserFacingError);
			const [, , charged] = repository.debitWallet.mock.calls[0] ?? [];
			const [, , refunded] = repository.adjustWallet.mock.calls[0] ?? [];
			if (charged === undefined || refunded !== charged) kept.push(section);
			jest.clearAllMocks();
		}

		expect(kept).toEqual([]);
	});

	/** Pressing Sell twice paid the half price back twice for one house. */
	it("refunds a house only for the press that sold it", async () => {
		repository.requireAccount.mockResolvedValue({
			...ACCOUNT,
			house: {
				houseId: "small_apartment",
				name: "Small apartment",
				emoji: "🏠",
				value: 1_000,
				purchasedAt: new Date(),
			},
		});

		await expect(shopPress("sell-yes", "houses", "small_apartment")).rejects.toBeInstanceOf(UserFacingError);

		expect(repository.emptySlot).toHaveBeenCalledWith(expect.any(String), USER_ID, "house", "small_apartment");
		expect(repository.adjustWallet).not.toHaveBeenCalled();
	});
});

describe("the heist", () => {
	/** Start now stopped the timer that plays the heist and played nothing, so the server could never hold another. */
	it("plays the heist when its leader presses Start now", async () => {
		formingHeist();
		const interaction = pressed();
		const client = createMockClient();

		await heist.run(interaction as never, { client, action: "start", args: [GUILD, USER_ID] });

		expect(client.timers.stop).toHaveBeenCalledWith(`heist:${GUILD}`);
		expect(interaction.followUp).toHaveBeenCalledTimes(1);
		expect(activeHeists().has(GUILD)).toBe(false);
	});

	/** A join still reading the wallet when the heist played redrew the finished heist's message with its buttons back. */
	it("refuses a join that lands after the heist has played, and redraws nothing", async () => {
		formingHeist();
		repository.findAccount.mockImplementationOnce(() => {
			activeHeists().delete(GUILD);
			return Promise.resolve({ wallet: 1_000, lastHeist: null });
		});
		const interaction = pressed({ user: { id: "500000000000000009" } });

		await expect(
			heist.run(interaction as never, { client: createMockClient(), action: "join", args: [GUILD] }),
		).rejects.toEqual(new UserFacingError("That heist has already finished."));
		expect(interaction.update).not.toHaveBeenCalled();
	});

	/** Joining is a way in to the economy, so it is refused wherever `/heist` itself would be. */
	it("asks the gates every control anybody may press asks", async () => {
		formingHeist();
		jest.mocked(checkOpenControl).mockResolvedValueOnce("The bot is paused.");
		const interaction = pressed({ user: { id: "500000000000000009" } });

		await expect(
			heist.run(interaction as never, { client: createMockClient(), action: "join", args: [GUILD] }),
		).rejects.toEqual(new UserFacingError("The bot is paused."));
		expect(activeHeists().get(GUILD)?.participants.size).toBe(2);
	});
});

/** Wiping every account in a server is asked of Administrator on the press too, not only when the warning was drawn. */
it("wipes nothing for somebody who is no longer an administrator", async () => {
	const demoted = pressed({ memberPermissions: new PermissionsBitField([PermissionFlagsBits.ManageGuild]) });

	await expect(reset.run(demoted as never, { client: {} as never, action: "economy-yes", args: [] })).rejects.toThrow(
		UserFacingError,
	);
	expect(repository.resetGuild).not.toHaveBeenCalled();

	await reset.run(pressed() as never, { client: {} as never, action: "economy-yes", args: [] });
	expect(repository.resetGuild).toHaveBeenCalledTimes(1);
});
