const dadJokeCommand = require('../../commands/Community/dadJoke');
const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');

const originalFetch = global.fetch;

describe('dad-joke command', () => {
    let interaction;
    let client;
    let fetchMock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock;
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        teardownTest();
    });

    it('should fetch a dad joke and reply with an embed', async () => {
        const mockJoke = { 
            id: 'abc123', 
            joke: 'Why don\'t skeletons fight each other? They don\'t have the guts.' 
        };
        
        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue(mockJoke)
        };
        
        fetchMock.mockResolvedValue(mockResponse);

        await dadJokeCommand.execute(interaction, client);

        expect(fetchMock).toHaveBeenCalledWith('https://icanhazdadjoke.com/', {
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
                        description: '> Why don\'t skeletons fight each other? They don\'t have the guts.',
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
        const mockResponse = {
            ok: false,
        };
        
        fetchMock.mockResolvedValue(mockResponse);

        await dadJokeCommand.execute(interaction, client);

        expect(fetchMock).toHaveBeenCalledWith('https://icanhazdadjoke.com/', {
            headers: {
                Accept: 'application/json',
            },
        });

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'An **error occurred** while attempting to fetch a dad joke. Please try again later.',
            flags: MessageFlags.Ephemeral,
        });
    });
});