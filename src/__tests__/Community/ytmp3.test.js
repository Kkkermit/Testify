const ytmp3Command = require('../../commands/Community/ytmp3');
const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');
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
        
        const mockResponseData = {
            link: 'https://example.com/download/dQw4w9WgXcQ.mp3',
            title: 'Rick Astley - Never Gonna Give You Up'
        };
        axios.request.mockResolvedValue({ data: mockResponseData });
        
        await ytmp3Command.execute(interaction, client);
        
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
    });

    it('should handle missing API key', async () => {
        delete process.env.rapidapikey;
        
        await ytmp3Command.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalledWith(
            expect.stringContaining('No API key has been provided')
        );
        
        expect(interaction.editReply).not.toHaveBeenCalled();
    });
});
