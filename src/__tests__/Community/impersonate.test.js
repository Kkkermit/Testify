const impersonateCommand = require('../../commands/Community/impersonate');
const { setupTest, teardownTest, MessageFlags, PermissionsBitField } = require('../utils/testUtils');

jest.mock('../../jsons/filter.json', () => ({
    words: ['badword']
}));

describe('impersonate command', () => {
    let interaction;
    let client;
    let mockWebhook;
    let mockChannel;
    let mockUser;
    let mockMember;

    beforeEach(() => {
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        mockWebhook = setup.mockWebhook;
        mockChannel = setup.mockChannel;
        mockUser = setup.mockUser;
        mockMember = setup.mockMember;
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
    });

    it('should create a webhook and send a message successfully', async () => {
        const testMessage = 'This is a test message';
        interaction.options.getString.mockReturnValue(testMessage);

        await impersonateCommand.execute(interaction, client);

        expect(interaction.channel.createWebhook).toHaveBeenCalledWith({ 
            name: mockUser.displayName, 
            avatar: mockUser.displayAvatarURL()
        });
        
        expect(mockWebhook.send).toHaveBeenCalledWith({ 
            content: testMessage 
        });
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('has been **successfully** impersonated'),
            flags: MessageFlags.Ephemeral
        });

        jest.advanceTimersByTime(3000);
        expect(mockWebhook.delete).toHaveBeenCalled();
    });

    it('should reject filtered words', async () => {
        const filteredWord = 'badword';
        interaction.options.getString.mockReturnValue(filteredWord);

        await impersonateCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: client.config.filterMessage,
            flags: MessageFlags.Ephemeral
        });
        
        expect(interaction.channel.createWebhook).not.toHaveBeenCalled();
    });

    it('should reject if user lacks permissions', async () => {
        const originalExecute = impersonateCommand.execute;
        
        impersonateCommand.execute = jest.fn(async (interaction, client) => {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.CreateWebhook)) {
                return interaction.reply({
                    content: 'You **do not** have the required permissions to use this command!\nMissing Permissions: `create webhook`',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            return originalExecute(interaction, client);
        });
        
        interaction.options.getString.mockReturnValue('Test message');
        
        interaction.member.permissions.has.mockImplementation((permission) => {
            if (permission === PermissionsBitField.Flags.CreateWebhook) {
                return false;
            }
            return true;
        });
        
        client.config.noPerms = 'You **do not** have the required permissions to use this command!\nMissing Permissions: `create webhook`';

        await impersonateCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'You **do not** have the required permissions to use this command!\nMissing Permissions: `create webhook`',
            flags: MessageFlags.Ephemeral
        });
        
        expect(interaction.channel.createWebhook).not.toHaveBeenCalled();
        
        impersonateCommand.execute = originalExecute;
    });

    it('should reject messages containing @everyone', async () => {
        interaction.options.getString.mockReturnValue('Hello @everyone');

        await impersonateCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('cannot** mention'),
            flags: MessageFlags.Ephemeral
        });
        
        expect(interaction.channel.createWebhook).not.toHaveBeenCalled();
    });

    it('should reject messages containing @here', async () => {
        interaction.options.getString.mockReturnValue('Hello @here');

        await impersonateCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining('cannot** mention'),
            flags: MessageFlags.Ephemeral
        });
        
        expect(interaction.channel.createWebhook).not.toHaveBeenCalled();
    });
});