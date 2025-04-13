const ytmp3Command = require('../commands/Community/ytmp3');
const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const axios = require('axios');

jest.mock('axios');

describe('ytmp3 command', () => {
    let interaction;
    let client;
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        
        process.env = { ...originalEnv, rapidapikey: 'mock-api-key' };
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        
        interaction.deferReply = jest.fn().mockResolvedValue();
        interaction.editReply = jest.fn().mockResolvedValue();
        
        client.logs = {
            error: jest.fn()
        };
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = originalEnv;
        teardownTest();
        jest.clearAllMocks();
    });

    it('should fetch YouTube MP3 and display a download button', async () => {
        const videoId = 'dQw4w9WgXcQ';
        interaction.options.getString.mockReturnValue(videoId);
        
        const mockResponse = {
            data: {
                title: 'Rick Astley - Never Gonna Give You Up',
                link: 'https://example.com/download/dQw4w9WgXcQ.mp3',
                success: true,
                duration: 213
            }
        };
        axios.request.mockResolvedValue(mockResponse);

        await ytmp3Command.execute(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
        
        expect(axios.request).toHaveBeenCalledWith({
            method: 'GET',
            url: 'https://youtube-mp3-download1.p.rapidapi.com/dl',
            params: { id: videoId },
            headers: {
                'X-RapidAPI-Key': 'mock-api-key',
                'X-RapidAPI-Host': 'youtube-mp3-download1.p.rapidapi.com',
            },
        });

        expect(interaction.editReply).toHaveBeenCalled();
        const replyCall = interaction.editReply.mock.calls[0][0];
        
        expect(replyCall.embeds).toBeDefined();
        expect(replyCall.embeds.length).toBe(1);
        
        const embed = replyCall.embeds[0];
        expect(embed.data).toMatchObject({
            author: { name: 'Youtube MP3 Command DevName' },
            title: 'TestBot Youtube MP3 Tool ➡️',
            description: expect.stringContaining('Rick Astley - Never Gonna Give You Up'),
            color: 65280,
            url: 'https://example.com/download/dQw4w9WgXcQ.mp3'
        });
        
        expect(replyCall.components).toBeDefined();
        expect(replyCall.components.length).toBe(1);
        
        const buttonRow = replyCall.components[0];
        expect(buttonRow).toBeDefined();
        
        console.log('Components structure:', JSON.stringify(replyCall.components, null, 2));
        
    });

    it('should handle missing API key', async () => {
        delete process.env.rapidapikey;
        
        interaction.options.getString.mockReturnValue('anyVideoId');

        await ytmp3Command.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalledWith(expect.stringContaining('No API key has been provided'));
        
        expect(axios.request).not.toHaveBeenCalled();
        
        expect(interaction.editReply).not.toHaveBeenCalled();
    });

    it('should handle API errors for invalid video IDs', async () => {
        const invalidVideoId = 'invalid-video-id';
        interaction.options.getString.mockReturnValue(invalidVideoId);
        
        const mockError = new Error('Video not found');
        axios.request.mockRejectedValue(mockError);

        await ytmp3Command.execute(interaction, client);
        
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: expect.stringContaining('That video ID **does not** exist!')
        });
    });

    it('should handle unexpected API response formats', async () => {
        interaction.options.getString.mockReturnValue('someVideoId');
        
        const mockResponse = {
            data: {
                success: true
            }
        };
        axios.request.mockResolvedValue(mockResponse);

        await ytmp3Command.execute(interaction, client);
        
        expect(interaction.editReply).toHaveBeenCalled();
    });
});
