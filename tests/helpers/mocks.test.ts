import {
	createMockChannel,
	createMockClient,
	createMockInteraction,
	createMockMessage,
	createMockModel,
	createMockSubcommandInteraction,
	createMockUser,
	OWNER_ID,
	USER_ID,
} from "@tests/helpers/mocks";

describe("the mock factories", () => {
	it("stubs every method, so a test configures only what it cares about", () => {
		const interaction = createMockInteraction();

		expect(jest.isMockFunction(interaction.reply)).toBe(true);
		expect(jest.isMockFunction(interaction.deferReply)).toBe(true);
		expect(jest.isMockFunction(interaction.options.getString)).toBe(true);
	});

	it("answers the options it was given and null for the rest", () => {
		const interaction = createMockInteraction({ options: { reason: "spamming", days: 3 } });

		expect(interaction.options.getString("reason")).toBe("spamming");
		expect(interaction.options.getInteger("days")).toBe(3);
		expect(interaction.options.getString("missing")).toBeNull();
	});

	it("collects replies so a test can assert on the answer", async () => {
		const interaction = createMockInteraction();

		await interaction.reply({ content: "Pong" });
		await interaction.editReply({ content: "Pong!" });

		expect(interaction.sent).toEqual([{ content: "Pong" }, { content: "Pong!" }]);
	});

	/** A naive `??` default would ignore an override of null, 0 or false. */
	it("honours a falsy override rather than falling back to the default", () => {
		expect(createMockUser({ bot: true }).bot).toBe(true);
		expect(createMockChannel({ nsfw: false }).nsfw).toBe(false);
		expect(createMockInteraction({ inGuild: false }).guild).toBeNull();
		expect(createMockInteraction({ overrides: { guildId: null } }).guildId).toBeNull();
	});

	it("builds an interaction that names a subcommand", () => {
		const interaction = createMockSubcommandInteraction("set", { options: { prefix: "!" } });

		expect(interaction.options.getSubcommand()).toBe("set");
		expect(interaction.options.getString("prefix")).toBe("!");
	});

	it("builds a message for the prefix surface", async () => {
		const message = createMockMessage({ content: "t?ping" });

		await message.reply({ content: "Pong" });

		expect(message.content).toBe("t?ping");
		expect(message.sent).toEqual([{ content: "Pong" }]);
	});

	it("distinguishes the owner from anyone else", () => {
		const client = createMockClient();

		expect(client.isOwner(OWNER_ID)).toBe(true);
		expect(client.isOwner(USER_ID)).toBe(false);
	});
});

describe("createMockModel", () => {
	it("resolves the document it was given through the query chain", async () => {
		const model = createMockModel({ guildId: "1", wallet: 500 }) as {
			findOne: () => { lean: () => { exec: () => Promise<unknown> } };
		};

		expect(await model.findOne().lean().exec()).toEqual({ guildId: "1", wallet: 500 });
	});

	it("resolves null when told the record does not exist", async () => {
		const model = createMockModel(null) as { findOne: () => { exec: () => Promise<unknown> } };
		expect(await model.findOne().exec()).toBeNull();
	});

	it("lets a single method be replaced without rebuilding the rest", async () => {
		const model = createMockModel(
			{ wallet: 500 },
			{ deleteOne: jest.fn(() => ({ exec: () => Promise.resolve({ deletedCount: 0 }) })) },
		) as {
			findOne: () => { exec: () => Promise<unknown> };
			deleteOne: () => { exec: () => Promise<unknown> };
		};

		expect(await model.findOne().exec()).toEqual({ wallet: 500 });
		expect(await model.deleteOne().exec()).toEqual({ deletedCount: 0 });
	});
});
