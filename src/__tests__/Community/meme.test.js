const memeCommand = require('../../commands/Community/meme');
const { setupTest, teardownTest } = require('../utils/testUtils');
const axios = require('axios');

jest.mock('axios');

describe('meme command', () => {
    let interaction;
    let client;
    let consoleErrorSpy;

    beforeEach(() => {
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        
        client.logs = {
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn()
        };
        
        interaction.deferReply = jest.fn().mockResolvedValue();
        interaction.editReply = jest.fn().mockResolvedValue();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
        consoleErrorSpy.mockRestore();
    });

    it('should fetch and display a random meme', async () => {
        const mockMemeData = {
            data: {
                data: {
                    children: [
                        {
                            data: {
                                title: 'Funny meme title',
                                url: 'https://example.com/meme.jpg',
                                ups: 1234,
                                num_comments: 56,
                                permalink: '/r/memes/comments/abc123/funny_meme_title/',
                                is_self: false,
                                stickied: false,
                                over_18: false
                            }
                        }
                    ]
                }
            }
        };
        
        axios.get.mockResolvedValue(mockMemeData);

        await memeCommand.execute(interaction, client);

        expect(axios.get).toHaveBeenCalledWith(
            'https://www.reddit.com/r/memes/hot.json?limit=100', 
            expect.objectContaining({
                headers: expect.objectContaining({
                    'User-Agent': expect.stringContaining('DiscordBot'),
                    'Accept': 'application/json'
                })
            })
        );

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalled();
        
        const replyCall = interaction.editReply.mock.calls[0][0];
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
        axios.get.mockResolvedValue({ data: {} });

        await memeCommand.execute(interaction, client);

        expect(client.logs.error).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: 'Failed to fetch a meme. Try again later.'
        });
    });

    it('should handle errors from the Reddit API', async () => {
        const mockError = new Error('Network error');
        mockError.response = {
            status: 403,
            data: { message: "Forbidden", error: 403 }
        };
        axios.get.mockRejectedValue(mockError);

        await memeCommand.execute(interaction, client);

        expect(client.logs.error).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: 'There was an error getting the meme from Reddit. Try again later!'
        });
    });

    it('should handle NSFW posts', async () => {
        const mockMemeData = {
            data: {
                data: {
                    children: [
                        {
                            data: {
                                title: 'NSFW meme',
                                url: 'https://example.com/meme.jpg',
                                ups: 1234,
                                permalink: '/r/memes/comments/abc123/nsfw_meme/',
                                is_self: false,
                                over_18: true,
                                stickied: false
                            }
                        },
                        {
                            data: {
                                title: 'Safe meme',
                                url: 'https://example.com/safe.jpg',
                                ups: 1000,
                                permalink: '/r/memes/comments/def456/safe_meme/',
                                is_self: false,
                                over_18: false,
                                stickied: false,
                                num_comments: 42
                            }
                        }
                    ]
                }
            }
        };
        
        axios.get.mockResolvedValue(mockMemeData);

        await memeCommand.execute(interaction, client);

        const replyCall = interaction.editReply.mock.calls[0][0];
        const embed = replyCall.embeds[0];
        
        expect(embed.data.description).toContain('Safe meme');
        expect(embed.data.image.url).toBe('https://example.com/safe.jpg');
        expect(embed.data.footer.text).toContain('💬 42');
    });

    it('should handle missing comments count in the Reddit API response', async () => {
        const mockMemeData = {
            data: {
                data: {
                    children: [
                        {
                            data: {
                                title: 'Funny meme title',
                                url: 'https://example.com/meme.jpg',
                                ups: 1234,
                                permalink: '/r/memes/comments/abc123/funny_meme_title/',
                                is_self: false,
                                stickied: false,
                                over_18: false
                            }
                        }
                    ]
                }
            }
        };
        
        axios.get.mockResolvedValue(mockMemeData);

        await memeCommand.execute(interaction, client);

        const replyCall = interaction.editReply.mock.calls[0][0];
        const embed = replyCall.embeds[0];
        
        expect(embed.data.footer.text).toContain('💬 0');
    });
});