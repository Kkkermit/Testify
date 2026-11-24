import { MessageFlags } from "discord.js";
import balance from "@buttons/balance";
import money from "@buttons/money";
import { UserFacingError } from "@core/errors";
import { deposit, requireAccount } from "@database/repositories/economyRepository";
import { type ContainerMessage } from "@lib/discord/discord.types";
import { BALANCE_PANEL_ID, MONEY_PANEL_ID } from "@lib/economy/economy.constants";
import { claimDaily } from "@lib/economy/economyActions.util";
import { idsOf, textOf } from "@tests/helpers/containers";

jest.mock("@lib/economy/economyActions.util", () => ({
	...jest.requireActual<object>("@lib/economy/economyActions.util"),
	claimDaily: jest.fn(),
}));
jest.mock("@database/repositories/economyRepository", () => ({
	requireAccount: jest.fn(),
	deposit: jest.fn(),
	withdraw: jest.fn(),
}));

const OWNER = "100000000000000001";
const ACCOUNT = {
	wallet: 1_000,
	bank: 400,
	lastDaily: null,
	inventory: [],
	house: null,
	businesses: [],
	job: "Unemployed",
	pet: null,
};

function pressed() {
	return {
		guild: { id: "900000000000000001" },
		user: { id: OWNER, username: "kermit", displayAvatarURL: () => "https://cdn.example/a.png" },
		isButton: () => true,
		isModalSubmit: () => false,
		update: jest.fn(() => Promise.resolve()),
	};
}

const client = {} as never;

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(requireAccount).mockResolvedValue(ACCOUNT as never);
	jest.mocked(deposit).mockResolvedValue({ wallet: 750, bank: 650 } as never);
});

function sent(interaction: ReturnType<typeof pressed>): ContainerMessage & { embeds?: unknown } {
	return (interaction.update.mock.calls as unknown as [ContainerMessage][])[0]![0];
}

describe("the balance panel's buttons", () => {
	/** Deposit swapped the V2 panel for an embed, and Discord refused the whole update. */
	it.each(["dep", "wit", "shop", "inv", "refresh"])(
		"keeps %s a V2 message, as the panel it replaces",
		async (action) => {
			const interaction = pressed();
			await balance.run(interaction as never, { client, action, args: [OWNER] });

			const payload = sent(interaction);
			expect(payload.flags & MessageFlags.IsComponentsV2).toBeTruthy();
			expect(payload.embeds).toBeUndefined();
		},
	);

	/** A second press drew "already claimed" on the panel under a tick, as though it had paid. */
	it("refuses a daily already claimed privately, leaving the panel as it was", async () => {
		jest.mocked(claimDaily).mockResolvedValue({ claimed: false, message: "You have already claimed today." });
		const interaction = pressed();

		await expect(balance.run(interaction as never, { client, action: "daily", args: [OWNER] })).rejects.toEqual(
			new UserFacingError("You have already claimed today."),
		);
		expect(interaction.update).not.toHaveBeenCalled();
	});

	it("opens the shop with a way back to the balance panel", async () => {
		const interaction = pressed();
		await balance.run(interaction as never, { client, action: "shop", args: [OWNER] });

		expect(idsOf(sent(interaction))).toContain(`${BALANCE_PANEL_ID}:refresh:${OWNER}`);
	});
});

describe("moving money", () => {
	it("goes back to the balance panel, saying what moved, when it was opened from there", async () => {
		const interaction = pressed();
		await money.run(interaction as never, { client, action: "dep-bal", args: ["250", "quarter", OWNER] });

		expect(deposit).toHaveBeenCalledWith("900000000000000001", OWNER, 250);
		expect(textOf(sent(interaction))).toContain("Deposited **250**.");
		expect(idsOf(sent(interaction))).toContain(`${BALANCE_PANEL_ID}:dep:${OWNER}`);
	});

	it("ends on its own V2 result when it was opened by /deposit", async () => {
		const interaction = pressed();
		await money.run(interaction as never, { client, action: "dep", args: ["250", "quarter", OWNER] });

		const payload = sent(interaction);
		expect(payload.flags & MessageFlags.IsComponentsV2).toBeTruthy();
		expect(textOf(payload)).toContain("Deposited 250");
		expect(idsOf(payload).filter((id) => id.startsWith(MONEY_PANEL_ID))).toEqual([]);
	});
});
