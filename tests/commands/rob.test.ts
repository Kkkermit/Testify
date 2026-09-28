import { type APIEmbed } from "discord.js";
import rob from "@commands/economy/rob.command";
import type * as Economy from "@lib/economy";
import { createMockClient, createMockInteraction, createMockUser } from "@tests/helpers/mocks";

jest.mock("@database/repositories/economyRepository", () => ({
	getOrCreateAccount: jest.fn(() => Promise.resolve({ wallet: 1_000, lastRobbed: null })),
	findAccount: jest.fn(() => Promise.resolve({ wallet: 10_000 })),
	setCooldown: jest.fn(() => Promise.resolve()),
	removeInventoryItem: jest.fn(() => Promise.resolve(false)),
	debitWallet: jest.fn(() => Promise.resolve({ wallet: 850 })),
	adjustWallet: jest.fn(() => Promise.resolve({ wallet: 2_000 })),
	incrementCounters: jest.fn(() => Promise.resolve()),
}));
jest.mock("@lib/economy", () => ({
	...jest.requireActual<object>("@lib/economy"),
	planRobbery: jest.fn(),
}));

const repository = jest.requireMock("@database/repositories/economyRepository");
const { planRobbery } = jest.requireMock("@lib/economy");
const { ROBBERY_SCENES } = jest.requireActual<typeof Economy>("@lib/economy");

const TARGET = createMockUser({ id: "300000000000000003", username: "bob", displayName: "Bob" });

function scene(name: string): Economy.SceneRule | undefined {
	return ROBBERY_SCENES.find((rule) => rule.scene === name);
}

async function robbed(): Promise<APIEmbed> {
	const interaction = createMockInteraction({ options: { user: TARGET } });
	await rob.run?.(interaction, createMockClient());

	const payload = interaction.sent[0] as { embeds: { toJSON(): APIEmbed }[] };
	return payload.embeds[0]!.toJSON();
}

function fields(built: APIEmbed): Record<string, string> {
	return Object.fromEntries((built.fields ?? []).map((field) => [field.name, field.value]));
}

beforeEach(() => jest.clearAllMocks());

describe("/rob", () => {
	/** The old embed said "Robbery successful" and nothing about whose money it was. */
	it("names who was robbed in the title, the story, a field and the picture", async () => {
		planRobbery.mockReturnValue({ rule: scene("clean"), amount: 1_000, line: "{target} lost **{amount}**." });

		const built = await robbed();

		expect(built.title).toBe("💰 You robbed Bob");
		expect(built.description).toBe("**Bob** lost **1,000**.");
		expect(fields(built).Target).toContain("<@300000000000000003>");
		expect(fields(built).Result).toBe("+1,000");
		expect(fields(built)["Your wallet"]).toBe("2,000");
		expect(built.thumbnail?.url).toBe("https://cdn.discord/avatar.png");
		expect(repository.debitWallet).toHaveBeenCalledWith(expect.any(String), "300000000000000003", 1_000);
	});

	it("hands a fought-back fine to the person you tried to rob", async () => {
		planRobbery.mockReturnValue({ rule: scene("fought"), amount: 100, line: "{target} took **{amount}**." });

		const built = await robbed();

		expect(built.title).toBe("🚨 Your robbery of Bob failed");
		expect(fields(built).Result).toBe("−100 to Bob");
		expect(repository.adjustWallet).toHaveBeenCalledWith(expect.any(String), "300000000000000003", 100);
	});

	it("keeps a police fine, rather than giving it to anybody", async () => {
		planRobbery.mockReturnValue({ rule: scene("caught"), amount: 150, line: "Fined **{amount}**." });

		await robbed();

		expect(repository.adjustWallet).not.toHaveBeenCalled();
	});

	it("says nothing was lost when the robber just walks away", async () => {
		planRobbery.mockReturnValue({ rule: scene("slipped"), amount: 0, line: "{target} got away." });

		const built = await robbed();

		expect(fields(built).Result).toBe("Nothing lost");
		expect(repository.debitWallet).not.toHaveBeenCalled();
	});

	it("names whose padlock held", async () => {
		repository.removeInventoryItem.mockResolvedValueOnce(true);

		const built = await robbed();

		expect(built.title).toBe("🔒 Bob's padlock held");
		expect(planRobbery).not.toHaveBeenCalled();
	});
});
