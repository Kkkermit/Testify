const lyricsCommand = require('../commands/Community/lyrics');
const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const superagent = require('superagent');

jest.mock('superagent');

describe('lyrics command', () => {
    let interaction;
    let client;

    beforeEach(() => {
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;

        interaction.deferReply = jest.fn();
        interaction.followUp = jest.fn();
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
    });

    it('should fetch and display lyrics for a song', async () => {
        const songName = 'Never Gonna Give You Up';
        interaction.options.getString.mockReturnValue(songName);

        const mockLyrics = "We're no strangers to love\nYou know the rules and so do I\nA full commitment's what I'm thinking of\nYou wouldn't get this from any other guy";
        const mockResponse = {
            body: {
                title: 'Never Gonna Give You Up',
                author: 'Rick Astley',
                lyrics: mockLyrics,
                thumbnail: { genius: 'https://example.com/thumbnail.jpg' },
                links: { genius: 'https://example.com/lyrics' },
                disclaimer: 'This is for educational purposes only'
            }
        };
        superagent.get.mockResolvedValue(mockResponse);

        await lyricsCommand.execute(interaction, client);

        expect(superagent.get).toHaveBeenCalledWith(
            `https://some-random-api.com/lyrics?title=${songName}`
        );

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalled();

        const followUpCall = interaction.followUp.mock.calls[0][0];
        expect(followUpCall.embeds).toBeDefined();
        expect(followUpCall.embeds.length).toBe(1);

        const embed = followUpCall.embeds[0];
        expect(embed.data).toMatchObject({
            title: 'TestBot Lyrics Tool ➡️',
            description: `**${songName}** Lyrics: `,
            color: 65280,
            thumbnail: { url: 'https://example.com/thumbnail.jpg' },
            image: { url: 'https://example.com/thumbnail.jpg' },
            url: 'https://example.com/lyrics',
            author: { name: 'Lyrics command DevName' },
            footer: { text: 'Disclaimer - This is for educational purposes only' }
        });

        const fields = embed.data.fields;
        expect(fields[0]).toEqual({ name: 'Title:', value: 'Never Gonna Give You Up', inline: true });
        expect(fields[1]).toEqual({ name: 'Artist:', value: 'Rick Astley', inline: true });
        expect(fields[2]).toEqual({ name: 'Lyrics:', value: mockLyrics });
    });

    it('should handle long lyrics by splitting them into multiple fields', async () => {
        const songName = 'Long Song';
        interaction.options.getString.mockReturnValue(songName);

        const longLyrics = 'A'.repeat(1500);
        
        const mockResponse = {
            body: {
                title: 'Long Song',
                author: 'Test Artist',
                lyrics: longLyrics,
                thumbnail: { genius: 'https://example.com/thumbnail.jpg' },
                links: { genius: 'https://example.com/lyrics' },
                disclaimer: 'This is for educational purposes only'
            }
        };
        superagent.get.mockResolvedValue(mockResponse);

        await lyricsCommand.execute(interaction, client);

        const followUpCall = interaction.followUp.mock.calls[0][0];
        const embed = followUpCall.embeds[0];
        const fields = embed.data.fields;

        expect(fields[0]).toEqual({ name: 'Title:', value: 'Long Song', inline: true });
        expect(fields[1]).toEqual({ name: 'Artist:', value: 'Test Artist', inline: true });

        expect(fields[2]).toEqual({ name: 'Lyrics:', value: 'A'.repeat(1024) });
        expect(fields[3]).toEqual({ name: 'Lyrics:', value: 'A'.repeat(1500-1024) });
    });

    it('should handle errors when fetching lyrics', async () => {
        interaction.options.getString.mockReturnValue('Unknown Song');

        const mockError = new Error('API Error');
        superagent.get.mockRejectedValue(mockError);

        jest.spyOn(console, 'log').mockImplementation(() => {});

        await lyricsCommand.execute(interaction, client);

        expect(superagent.get).toHaveBeenCalled();
        
        expect(interaction.followUp).toHaveBeenCalledWith({
            content: 'An error occurred, try again later!',
            flags: MessageFlags.Ephemeral
        });
    });
});
