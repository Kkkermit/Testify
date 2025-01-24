const axios = require('axios');
const animalFactsCommand = require('../commands/Community/animalFacts');
jest.mock('axios');

describe('animal-facts command', () => {
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

    it('should fetch an animal fact and reply with an embed', async () => {
        const mockResponse = {
            data: [
                {
                    data: {
                        children: [
                            {
                                data: {
                                    url: 'https://example.com/image.png',
                                    title: 'Interesting Animal Fact',
                                    ups: 123,
                                    num_comments: 45,
                                    permalink: '/r/animalfacts1935943924/comments/abc123/interesting_animal_fact/',
                                },
                            },
                        ],
                    },
                },
            ],
        };
        axios.get.mockResolvedValue(mockResponse);

        await animalFactsCommand.execute(interaction, client);

        expect(axios.get).toHaveBeenCalledWith('https://www.reddit.com/r/animalfacts1935943924/random/.json');
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        author: {
                            name: 'Animal Facts Command DevName',
                        },
                        color: 65280,
                        title: 'TestBot Animal Facts ➡️',
                        description: '**Interesting Animal Fact**',
                        url: 'https://www.reddit.com/r/animalfacts1935943924/comments/abc123/interesting_animal_fact/',
                        image: {
                            url: 'https://example.com/image.png',
                        },
                        footer: {
                            text: '👍 123  |  💬 45',
                        },
                        timestamp: '2024-09-28T00:12:30.643Z',
                    },
                },
            ],
        });
    });

    it('should reply with an error message if fetching the animal fact fails', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));

        await animalFactsCommand.execute(interaction, client);

        expect(axios.get).toHaveBeenCalledWith('https://www.reddit.com/r/animalfacts1935943924/random/.json');
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'There was an error getting the meme from axios!',
            ephemeral: true,
        });
    });

    it('should reply with a failure message if the response data is invalid', async () => {
        const mockResponse = { data: [] };
        axios.get.mockResolvedValue(mockResponse);

        await animalFactsCommand.execute(interaction, client);

        expect(axios.get).toHaveBeenCalledWith('https://www.reddit.com/r/animalfacts1935943924/random/.json');
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'Failed to fetch a meme. Try again later.',
            ephemeral: true,
        });
    });
});