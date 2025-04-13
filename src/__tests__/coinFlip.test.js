const coinFlipCommand = require("../commands/Community/coinFlip");
const { setupTest, teardownTest } = require("./testUtils");

describe("coin-flip command", () => {
	let interaction;
	let client;

	beforeEach(() => {
		const setup = setupTest();
		interaction = setup.interaction;
		client = setup.client;
	});

	afterEach(() => {
		teardownTest();
	});

	it("should reply with a coin flip embed and then edit the reply with the result", async () => {
		await coinFlipCommand.execute(interaction, client);

		expect(interaction.reply).toHaveBeenCalledWith({
			embeds: [
				{
					data: {
						author: {
							icon_url: undefined,
							name: "Coin Flip Command DevName",
							url: undefined,
						},
						title: "TestBot Coin Flip Tool ➡️",
						description: "Flipping a coin...",
						color: 65280,
						image: {
							url: "https://media.discordapp.net/attachments/1083650198850523156/1084439687495700551/img_7541.gif?width=1600&height=1200",
						},
					},
				},
			],
			fetchReply: true,
		});

		jest.advanceTimersByTime(1000);

		expect(interaction.editReply).toHaveBeenCalled();
        
        const editReplyArgs = interaction.editReply.mock.calls[0][0];
        const editEmbed = editReplyArgs.embeds[0];
        
        expect(editEmbed.data.description).toMatch(/^Its a \*\*(Heads|Tails)\*\*$/);
        
        const validDescriptions = ["Its a **Heads**", "Its a **Tails**"];
        expect(validDescriptions).toContain(editEmbed.data.description);

        expect(editEmbed.data).toMatchObject({
            author: { name: "Coin Flip Command DevName" },
            title: "TestBot Coin Flip Tool ➡️",
            color: 65280,
            thumbnail: { url: expect.any(String) },
            footer: {
                text: expect.any(String),
                icon_url: expect.any(String)
            },
            timestamp: expect.any(String)
        });
	});
});
