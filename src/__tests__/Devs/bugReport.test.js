const { setupTest, teardownTest, MessageFlags, TextInputStyle } = require('../utils/testUtils');

jest.mock('discord.js', () => {
    const original = jest.requireActual('discord.js');
    return {
        ...original,
        WebhookClient: jest.fn()
    };
});

const { WebhookClient } = require('discord.js');
const bugReportCommand = require('../../commands/Devs/bugReport');

describe('bug-report command', () => {
    let interaction;
    let client;
    let mockGuild;
    let mockResponse;
    let mockWebhookClient;
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv, webhookBugLogging: 'https://discord.com/api/webhooks/mock/url' };
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        mockWebhookClient = setup.mockWebhookClient;
        
        WebhookClient.mockImplementation(() => mockWebhookClient);
        
        interaction.showModal = jest.fn(modal => {
            interaction.lastShownModal = modal;
            return Promise.resolve();
        });
        interaction.awaitModalSubmit = jest.fn();
        interaction.user.send = jest.fn().mockResolvedValue({});
        
        client.logs = {
            error: jest.fn()
        };
        
        client.config.embedDev = '#FF0000';
        client.config.embedColor = '#0099FF';
        
        mockResponse = {
            fields: {
                getTextInputValue: jest.fn().mockReturnValue('Test bug report message')
            },
            reply: jest.fn().mockResolvedValue({})
        };
        
        mockGuild = {
            name: 'Test Guild',
            iconURL: jest.fn().mockReturnValue('https://example.com/guild-icon.png')
        };
        interaction.guild = mockGuild;
    });

    afterEach(() => {
        process.env = originalEnv;
        teardownTest();
        jest.clearAllMocks();
    });

    it('should show a modal for bug report submission', async () => {
        await bugReportCommand.execute(interaction, client);
        
        expect(interaction.showModal).toHaveBeenCalled();
        expect(interaction.lastShownModal).toBeDefined();
        
        const modal = interaction.lastShownModal;
        expect(modal.data.custom_id).toBe('report');
        expect(modal.data.title).toBe('Report a bug');
        
        const actionRow = modal.components[0];
        expect(actionRow).toBeDefined();
        
        const textInput = actionRow.components[0];
        expect(textInput).toBeDefined();
        expect(textInput.data.custom_id).toBe('report');
        expect(textInput.data.label).toBe('Bug Report | Issue');
        expect(textInput.data.required).toBe(true);
        expect(textInput.data.style).toBe(TextInputStyle.Paragraph);
        expect(textInput.data.max_length).toBe(250);
        expect(textInput.data.min_length).toBe(5);
        expect(textInput.data.placeholder).toBe('Type your issue here');
    });

    it('should process the bug report when modal is submitted', async () => {
        interaction.awaitModalSubmit.mockResolvedValue(mockResponse);
        
        await bugReportCommand.execute(interaction, client);
        
        expect(WebhookClient).toHaveBeenCalledWith({ url: 'https://discord.com/api/webhooks/mock/url' });
        
        expect(mockWebhookClient.send).toHaveBeenCalled();
        const webhookCall = mockWebhookClient.send.mock.calls[0][0];
        
        expect(webhookCall.username).toContain('Bug Report Logger');
        expect(webhookCall.avatarURL).toBeDefined();
        
        expect(webhookCall.embeds).toBeDefined();
        expect(webhookCall.embeds.length).toBe(1);
        
        const embed = webhookCall.embeds[0];
        const embedData = embed.data || embed;
        
        expect(embedData.title).toContain('Bug Report Tool');
        expect(embedData.description).toContain('Test bug report message');
        expect(embedData.color).toBe(parseInt('FF0000', 16));
        
        expect(interaction.user.send).toHaveBeenCalled();
        
        const dmCall = interaction.user.send.mock.calls[0][0];
        expect(dmCall.embeds).toBeDefined();
        expect(dmCall.embeds.length).toBe(1);
        
        const dmEmbed = dmCall.embeds[0];
        const dmEmbedData = dmEmbed.data || dmEmbed;
        expect(dmEmbedData.title).toContain('You\'ve sent a bug report');
        
        expect(mockResponse.reply).toHaveBeenCalled();
        const replyCall = mockResponse.reply.mock.calls[0][0];
        
        const replyEmbed = replyCall.embeds[0];
        const replyEmbedData = replyEmbed.data || replyEmbed;
        expect(replyEmbedData.title).toContain('You\'ve sent a bug report');
        expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
    });

    it('should handle missing webhook URL', async () => {
        delete process.env.webhookBugLogging;
        
        interaction.awaitModalSubmit.mockResolvedValue(mockResponse);
        
        await bugReportCommand.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalledWith(
            expect.stringContaining('No webhook URL provided')
        );
        
        expect(WebhookClient).not.toHaveBeenCalled();
    });

    it('should handle webhook send errors', async () => {
        interaction.awaitModalSubmit.mockResolvedValue(mockResponse);
        
        mockWebhookClient.send.mockRejectedValueOnce(new Error('Webhook send error'));
        
        await bugReportCommand.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalledWith(
            expect.stringContaining('Error whilst sending webhook:'),
            expect.anything()
        );
        
        expect(interaction.user.send).toHaveBeenCalled();
        expect(mockResponse.reply).toHaveBeenCalled();
    });

    it('should handle DM send errors', async () => {
        interaction.awaitModalSubmit.mockResolvedValue(mockResponse);
        
        const mockError = new Error('DM send error');
        interaction.user.send.mockRejectedValueOnce(mockError);
        
        await bugReportCommand.execute(interaction, client);
        
        expect(mockResponse.reply).toHaveBeenCalled();
    });

    it('should handle modal timeout', async () => {
        interaction.awaitModalSubmit.mockRejectedValue(new Error('Modal timed out'));
        
        await bugReportCommand.execute(interaction, client);
        
        expect(client.logs.error).toHaveBeenCalled();
        
        expect(WebhookClient).not.toHaveBeenCalled();
        expect(interaction.user.send).not.toHaveBeenCalled();
        expect(mockResponse.reply).not.toHaveBeenCalled();
    });
});