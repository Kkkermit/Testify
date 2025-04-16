const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');

jest.mock('discord.js', () => {
    const original = jest.requireActual('discord.js');
    return {
        ...original,
        WebhookClient: jest.fn()
    };
});

const { WebhookClient } = require('discord.js');
const suggestionCommand = require('../../commands/Devs/suggestion');

describe('suggest command', () => {
    let interaction;
    let client;
    let mockGuild;
    let mockWebhookClient;
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv, webhookSuggestionLogging: 'https://discord.com/api/webhooks/mock/url' };
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        mockWebhookClient = setup.mockWebhookClient;
        
        WebhookClient.mockImplementation(() => mockWebhookClient);
        
        client.logs = {
            error: jest.fn()
        };
        
        client.config.embedDev = '#FF0000';
        client.config.embedColor = '#0099FF';
        
        mockGuild = {
            name: 'Test Guild',
            iconURL: jest.fn().mockReturnValue('https://example.com/guild-icon.png')
        };
        interaction.guild = mockGuild;
        
        interaction.user.send = jest.fn().mockResolvedValue({});
    });

    afterEach(() => {
        process.env = originalEnv;
        teardownTest();
        jest.clearAllMocks();
    });

    it('should send a suggestion through webhook and reply to user', async () => {
        const testSuggestion = 'This is a test suggestion';
        interaction.options.getString.mockReturnValue(testSuggestion);
        
        await suggestionCommand.execute(interaction, client);
        
        expect(WebhookClient).toHaveBeenCalledWith({ url: 'https://discord.com/api/webhooks/mock/url' });
        
        expect(mockWebhookClient.send).toHaveBeenCalled();
        const webhookCall = mockWebhookClient.send.mock.calls[0][0];
        
        expect(webhookCall.username).toContain('Suggestion Logger');
        expect(webhookCall.avatarURL).toBeDefined();
        
        expect(webhookCall.embeds).toBeDefined();
        expect(webhookCall.embeds.length).toBe(1);
        
        const embedData = webhookCall.embeds[0].data || webhookCall.embeds[0];
        expect(embedData.title).toContain('Suggestion Tool');
        expect(embedData.description).toContain(testSuggestion);
        expect(embedData.color).toBe(parseInt('FF0000', 16));
        
        expect(interaction.user.send).toHaveBeenCalled();
        const dmCall = interaction.user.send.mock.calls[0][0];
        expect(dmCall.embeds).toBeDefined();
        
        const dmEmbedData = dmCall.embeds[0].data || dmCall.embeds[0];
        expect(dmEmbedData.title).toContain('You\'ve sent a suggestion');
        expect(dmEmbedData.description).toContain(testSuggestion);
        
        expect(interaction.reply).toHaveBeenCalled();
        const replyCall = interaction.reply.mock.calls[0][0];
        expect(replyCall.embeds).toBeDefined();
        
        const replyEmbedData = replyCall.embeds[0].data || replyCall.embeds[0];
        expect(replyEmbedData.title).toContain('You\'ve sent a suggestion');
        expect(replyEmbedData.description).toContain(testSuggestion);
        expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
    });

    it('should handle missing webhook URL', async () => {
        delete process.env.webhookSuggestionLogging;
        
        interaction.options.getString.mockReturnValue('Test suggestion');
        
        await suggestionCommand.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalledWith(
            expect.stringContaining('No webhook URL provided')
        );
        
        expect(WebhookClient).not.toHaveBeenCalled();
        
        expect(interaction.user.send).not.toHaveBeenCalled();
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    it('should handle webhook send errors', async () => {
        interaction.options.getString.mockReturnValue('Test suggestion');
        
        const mockError = new Error('Webhook send error');
        mockWebhookClient.send.mockRejectedValueOnce(mockError);
        
        await suggestionCommand.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalledWith(
            expect.stringContaining('Error whilst sending webhook:'),
            expect.anything()
        );
        
        expect(interaction.user.send).toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle DM send errors', async () => {
        interaction.options.getString.mockReturnValue('Test suggestion');
        
        interaction.user.send.mockRejectedValueOnce(new Error('DM send error'));
        
        await suggestionCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle reply errors', async () => {
        interaction.options.getString.mockReturnValue('Test suggestion');
        
        interaction.reply.mockRejectedValueOnce(new Error('Reply error'));
        
        await expect(suggestionCommand.execute(interaction, client)).resolves.not.toThrow();
    });
});