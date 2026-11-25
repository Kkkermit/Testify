import beg from "@commands/economy/beg.command";
import lottery from "@commands/economy/lottery.command";
import pet from "@commands/economy/pet.command";
import rob from "@commands/economy/rob.command";
import work from "@commands/economy/work.command";
import { type Command } from "@core/command";
import { UserFacingError } from "@core/errors";
import { createMockClient, createMockInteraction, createMockUser, type MockOptions } from "@tests/helpers/mocks";

jest.mock("@database/repositories/tuningRepository", () => ({
	getTuning: jest.fn(() => Promise.resolve({ robbing: true, payRate: 100 })),
}));
jest.mock("@database/repositories/lotteryRepository", () => ({
	...jest.requireActual<object>("@database/repositories/lotteryRepository"),
	getLottery: jest.fn(() => Promise.resolve({ isActive: true, isFrozen: false, entryFee: 100, entries: [] })),
	addEntry: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@database/repositories/economyRepository", () => ({
	getOrCreateAccount: jest.fn(() =>
		Promise.resolve({
			wallet: 1_000,
			job: "Unemployed",
			jobLevel: 0,
			lastBegged: null,
			lastWorked: null,
			lastRobbed: null,
		}),
	),
	requireAccount: jest.fn(() =>
		Promise.resolve({
			wallet: 1_000,
			pet: { petId: "hamster", name: "Hammy", emoji: "🐹", happiness: 50, hunger: 50, lastFed: null, lastWalked: null },
		}),
	),
	findAccount: jest.fn(() => Promise.resolve({ wallet: 10_000 })),
	claimCooldown: jest.fn(() => Promise.resolve(false)),
	removeInventoryItem: jest.fn(() => Promise.resolve(null)),
	debitWallet: jest.fn(() => Promise.resolve({ wallet: 700 })),
	adjustWallet: jest.fn(() => Promise.resolve({ wallet: 1_000 })),
	incrementCounters: jest.fn(() => Promise.resolve()),
	emptySlot: jest.fn(() => Promise.resolve(false)),
	updatePet: jest.fn(() => Promise.resolve(false)),
}));

const repository = jest.requireMock("@database/repositories/economyRepository");

function run(command: Command, subcommand: string | null, options: MockOptions = {}): Promise<void> | undefined {
	const interaction = createMockInteraction({ subcommand, options });
	const target = subcommand === null ? command : command.subcommands?.find((sub) => sub.name === subcommand);
	return target?.run?.(interaction, createMockClient());
}

beforeEach(() => jest.clearAllMocks());

/** Two runs at once both read an expired cooldown, so both were paid; the one that loses the claim must move nothing. */
it("pays nothing to a run that loses the race for its cooldown", async () => {
	const runs: [name: string, command: Command, options: MockOptions][] = [
		["beg", beg, {}],
		["work", work, {}],
		["rob", rob, { user: createMockUser({ id: "300000000000000003", username: "bob" }) }],
	];

	const paid: string[] = [];
	for (const [name, command, options] of runs) {
		await expect(run(command, null, options)).rejects.toBeInstanceOf(UserFacingError);
		if (repository.adjustWallet.mock.calls.length > 0 || repository.debitWallet.mock.calls.length > 0) paid.push(name);
		jest.clearAllMocks();
	}

	expect(paid).toEqual([]);
});

/** Rehoming twice at once refunded twice, and a feed landing after a rehome wrote the pet back, so both were kept. */
it("pays out and keeps money only for a pet that is still there", async () => {
	await expect(run(pet, "rehome")).rejects.toBeInstanceOf(UserFacingError);
	expect(repository.adjustWallet).not.toHaveBeenCalled();

	await expect(run(pet, "feed")).rejects.toBeInstanceOf(UserFacingError);
	expect(repository.debitWallet).toHaveBeenCalledTimes(1);
	expect(repository.adjustWallet.mock.calls[0]?.[2]).toBe(repository.debitWallet.mock.calls[0]?.[2]);

	await expect(run(pet, "walk")).rejects.toBeInstanceOf(UserFacingError);
	await expect(run(pet, "rename", { name: "Rex" })).rejects.toBeInstanceOf(UserFacingError);
	expect(repository.updatePet.mock.calls.map(([, , petId]: unknown[]) => petId)).toEqual([
		"hamster",
		"hamster",
		"hamster",
	]);
});

/** The reply said "You have been refunded" when the lottery froze mid-entry, but the fee was never given back. */
it("gives the lottery fee back when the lottery closes before the entry lands", async () => {
	await expect(run(lottery, "enter", { tickets: 3 })).rejects.toThrow(
		new UserFacingError("The lottery closed before your entry landed. You have been refunded."),
	);

	expect(repository.debitWallet).toHaveBeenCalledWith(expect.any(String), expect.any(String), 300);
	expect(repository.adjustWallet).toHaveBeenCalledWith(expect.any(String), expect.any(String), 300);
});
