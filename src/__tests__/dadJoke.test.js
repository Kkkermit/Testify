const fetch = require('node-fetch');
const dadJokeCommand = require('../commands/Community/dadJoke');
jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('dad-joke command', () => {
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

    it('should fetch a dad joke and reply with an embed', async () => {
        const mockJoke = { 
            id: 'abc123', 
            joke: 'Why don’t skeletons fight each other? They don’t have the guts.' 
        };
        fetch.mockResolvedValue(new Response(JSON.stringify(mockJoke)));

        await dadJokeCommand.execute(interaction, client);

        expect(fetch).toHaveBeenCalledWith('https://icanhazdadjoke.com/', {
            headers: {
                Accept: 'application/json',
            },
        });

        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        author: { 
                            icon_url: undefined,
                            name: 'Dad Joke DevName',
                            url: undefined
                        },
                        title: 'TestBot Dad Joke ➡️',
                        description: '> Why don’t skeletons fight each other? They don’t have the guts.',
                        color: 65280,
                        footer: { 
                            text: 'Joke ID: abc123',
                            icon_url: undefined
                        },
                        thumbnail: { 
                            url: 'https://example.com/avatar.png' 
                        },
                        timestamp: '2024-09-28T00:12:30.643Z',
                    },
                },
            ],
        });
    });

    it('should reply with an error message if fetching the dad joke fails', async () => {
        fetch.mockResolvedValue(new Response(null, { status: 500 }));

        await dadJokeCommand.execute(interaction, client);

        expect(fetch).toHaveBeenCalledWith('https://icanhazdadjoke.com/', {
            headers: {
                Accept: 'application/json',
            },
        });

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'An **error occurred** while attempting to fetch a dad joke. Please try again later.',
            ephemeral: true,
        });
    });
});