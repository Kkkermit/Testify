const latencyCommand = require('../../commands/Community/latency');
const { setupTest, teardownTest } = require('../utils/testUtils');

describe("latency command", () => {
	let interaction;
	let client;
	let mockMessage;
	let mockCollector;

	beforeEach(() => {
		const setup = setupTest();
		interaction = setup.interaction;
		client = setup.client;
		mockMessage = setup.mockMessage;
		mockCollector = setup.mockCollector;
	});

	afterEach(() => {
		teardownTest();
		jest.clearAllMocks();
	});

	it("should reply with an embed containing the bot latency", async () => {
		interaction.client.ws.ping = 42;

		await latencyCommand.execute(interaction, client);

		expect(interaction.reply).toHaveBeenCalled();

		const callArgs = interaction.reply.mock.calls[0][0];

		expect(callArgs.embeds).toBeDefined();
		expect(callArgs.embeds.length).toBeGreaterThan(0);

		expect(callArgs.embeds[0]).toMatchObject({
			data: {
				author: { name: "Latency Command DevName" },
				title: "TestBot Latency Test ➡️",
				description: "**`🍯 LATENCY: 42 ms`**",
				color: 65280,
				footer: { text: "Requested by MockUser#1234" },
			},
		});

		expect(callArgs.components).toBeDefined();
		expect(callArgs.components.length).toBeGreaterThan(0);

		expect(callArgs.components[0]).toBeDefined();

		expect(mockMessage.createMessageComponentCollector).toHaveBeenCalled();
	});

	it("should update the embed when the refresh button is clicked", async () => {
		interaction.client.ws.ping = 42;

		await latencyCommand.execute(interaction, client);

		const mockButtonInteraction = {
			customId: "btn",
			update: jest.fn(),
		};

		await mockCollector.simulateCollect(mockButtonInteraction);

		expect(mockButtonInteraction.update).toHaveBeenCalled();

		const updateCallArgs = mockButtonInteraction.update.mock.calls[0][0];

		expect(updateCallArgs.embeds).toBeDefined();
		expect(updateCallArgs.embeds.length).toBeGreaterThan(0);
		expect(updateCallArgs.embeds[0]).toMatchObject({
			data: {
				author: { name: "Latency Command DevName" },
				title: "TestBot Latency Test ➡️",
				description: "**`🍯 LATENCY: 42 ms`**",
				color: 65280,
				footer: { text: "Requested by MockUser#1234" },
			},
		});

		expect(updateCallArgs.components).toBeDefined();
	});

	it("should not update if a different button is clicked", async () => {
		interaction.client.ws.ping = 42;

		await latencyCommand.execute(interaction, client);

		const mockButtonInteraction = {
			customId: "different-btn",
			update: jest.fn(),
		};

		await mockCollector.simulateCollect(mockButtonInteraction);

		expect(mockButtonInteraction.update).not.toHaveBeenCalled();
	});
});
