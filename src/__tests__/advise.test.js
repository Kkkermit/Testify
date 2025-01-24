const fetch = require('node-fetch');
const adviceCommand = require('../commands/Community/advice');
jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('advice command', () => {
    let interaction;
    let client;

    beforeEach(() => {
        interaction = {
            reply: jest.fn(),
        };

        client = {
            user: {
                username: 'TestBot',
                avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
            },
            config: {
                devBy: 'DevName',
                arrowEmoji: '➡️',
                embedCommunity: '#00FF00',
            },
        };

        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-09-28T00:12:30.643Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
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