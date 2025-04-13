const memeCommand = require('../commands/Community/meme');
const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const axios = require('axios');

jest.mock('axios');

describe('meme command', () => {
    let interaction;
    let client;

    beforeEach(() => {
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
    });

    it('should fetch and display a random meme', async () => {
        const mockMemeData = {
            data: [
                {
                    data: {
                        children: [
                            {
                                data: {
                                    title: 'Funny meme title',
                                    url: 'https://example.com/meme.jpg',
                                    ups: 1234,
                                    num_comments: 56,
                                    permalink: '/r/memes/comments/abc123/funny_meme_title/'
                                }
                            }
                        ]
                    }
                }
            ]
        };
        axios.get.mockResolvedValue({ data: mockMemeData.data });

        await memeCommand.execute(interaction, client);

        expect(axios.get).toHaveBeenCalledWith('https://www.reddit.com/r/memes/random.json');

        expect(interaction.reply).toHaveBeenCalled();
        const replyCall = interaction.reply.mock.calls[0][0];
        expect(replyCall.embeds).toBeDefined();
        expect(replyCall.embeds.length).toBe(1);

        const embed = replyCall.embeds[0];
        expect(embed.data).toMatchObject({
            author: { name: 'Meme Command DevName' },
            title: 'TestBot Meme Tool ➡️',
            description: '**Funny meme title**',
            color: 65280,
            image: { url: 'https://example.com/meme.jpg' },
            url: 'https://www.reddit.com/r/memes/comments/abc123/funny_meme_title/',
            footer: { text: '👍 1234  |  💬 56' }
        });
        expect(embed.data.timestamp).toBeDefined();
    });

    it('should handle empty or malformed Reddit API responses', async () => {
        axios.get.mockResolvedValue({ data: [] });

        await memeCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'Failed to fetch a meme. Try again later.',
            flags: MessageFlags.Ephemeral
        });
    });

    it('should handle errors from the Reddit API', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));

        await memeCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'There was an error getting the meme from axios!',
            flags: MessageFlags.Ephemeral
        });
    });

    it('should handle missing data in the Reddit API response', async () => {
        axios.get.mockResolvedValue({
            data: [{ data: { children: [] } }]
        });

        await memeCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'There was an error getting the meme from axios!',
            flags: MessageFlags.Ephemeral
        });
    });

    it('should handle missing comments count in the Reddit API response', async () => {
        const mockMemeData = {
            data: [
                {
                    data: {
                        children: [
                            {
                                data: {
                                    title: 'Funny meme title',
                                    url: 'https://example.com/meme.jpg',
                                    ups: 1234,
                                    permalink: '/r/memes/comments/abc123/funny_meme_title/'
                                }
                            }
                        ]
                    }
                }
            ]
        };
        axios.get.mockResolvedValue({ data: mockMemeData.data });

        await memeCommand.execute(interaction, client);

        const replyCall = interaction.reply.mock.calls[0][0];
        const embed = replyCall.embeds[0];
        
        expect(embed.data.footer.text).toContain('💬 0');
    });
});
