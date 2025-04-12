const fetch = require('node-fetch');
const adviceCommand = require('../commands/Community/advice');
const { setupTest, teardownTest } = require('./testUtils');

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('advice command', () => {
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

    it('should fetch advice and reply with an embed', async () => {
        const mockAdvice = { slip: { advice: 'Always test your code.' } };
        fetch.mockReturnValue(Promise.resolve(new Response(JSON.stringify(mockAdvice))));

        await adviceCommand.execute(interaction, client);

        expect(fetch).toHaveBeenCalledWith('https://api.adviceslip.com/advice');
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        title: 'TestBot Advice Randomizer ➡️',
                        description: '> Here is your random advice:',
                        fields: [
                            { name: 'Advice', value: '> Always test your code.' },
                        ],
                        color: 65280,
                        author: {
                            icon_url: undefined,
                            name: 'Community System DevName',
                            url: undefined,
                        },
                        footer: {
                            text: 'Advice given',
                            icon_url: undefined,
                        },
                        thumbnail: {
                            url: 'https://example.com/avatar.png',
                        },
                        timestamp: '2024-09-28T00:12:30.643Z',
                    },
                },
            ],
        });
    });
});