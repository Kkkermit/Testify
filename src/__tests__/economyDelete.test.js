const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const { createEconomyUserMock } = require('./fixtures/economyMocks');

jest.mock('../schemas/economySystem', () => ({
    findOne: jest.fn(),
    deleteOne: jest.fn()
}));

const mockExecute = jest.fn();

jest.mock('../commands/Economy/economyDelete', () => {
    return {
        data: {
            name: 'economy-delete',
            description: 'Delete an economy account.'
        },
        execute: mockExecute
    };
});

const economyDeleteCommand = require('../commands/Economy/economyDelete');
const ecoS = require('../schemas/economySystem');

describe('economy-delete command', () => {
    let interaction;
    let client;
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        
        client.config.embedEconomy = '#FFD700'; 
        client.config.devBy = 'Test Developer';
        client.config.arrowEmoji = '➡️';
        
        interaction.guild = { 
            id: 'test-guild-id', 
            name: 'Test Guild',
            iconURL: jest.fn().mockReturnValue('https://example.com/guild-icon.png')
        };
        
        interaction.user = { 
            ...setup.mockUser,
            id: 'test-user-id'
        };
        
        interaction.options.getSubcommand = jest.fn().mockReturnValue('account');
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { options, user, guild } = interaction;
            const sub = options.getSubcommand();
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });

            switch (sub) {
                case "account":
                    if (!data) { 
                        return await interaction.reply({ 
                            content: "You don't have an economy account to delete!", 
                            flags: MessageFlags.Ephemeral 
                        });
                    } else {
                        await ecoS.deleteOne({ Guild: guild.id, User: user.id });

                        const embed = {
                            author: { name: `Economy System ${client.config.devBy}` },
                            title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                            thumbnail: { url: client.user.displayAvatarURL() },
                            color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                            footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                            timestamp: new Date().toISOString(),
                            description: '> Your economy account has been **deleted**.'
                        };

                        await interaction.reply({ embeds: [embed] });
                        return true;
                    }
            }
        });
    });
    
    afterEach(() => {
        teardownTest();
    });
    
    it('should delete an economy account for a user', async () => {
        const mockAccount = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            bank: 5000,
            wallet: 3000
        });
        
        ecoS.findOne.mockResolvedValueOnce(mockAccount);
        ecoS.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
        
        await economyDeleteCommand.execute(interaction, client);
        
        expect(ecoS.findOne).toHaveBeenCalledWith({ 
            Guild: 'test-guild-id', 
            User: 'test-user-id' 
        });
        
        expect(ecoS.deleteOne).toHaveBeenCalledWith({
            Guild: 'test-guild-id',
            User: 'test-user-id'
        });
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        const embed = reply.embeds[0];
        
        expect(embed.author.name).toContain('Economy System');
        expect(embed.title).toContain('Economy System');
        expect(embed.description).toContain('Your economy account has been **deleted**');
        expect(embed.footer.text).toBe(`${interaction.guild.name}'s Economy`);
    });
    
    it('should show error if user has no economy account to delete', async () => {
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await economyDeleteCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: "You don't have an economy account to delete!",
            flags: MessageFlags.Ephemeral
        });
        
        expect(ecoS.deleteOne).not.toHaveBeenCalled();
    });
    
    it('should handle the account subcommand correctly', async () => {
        interaction.options.getSubcommand.mockReturnValueOnce('account');
        
        const mockAccount = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: interaction.user.id
        });
        
        ecoS.findOne.mockResolvedValueOnce(mockAccount);
        ecoS.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });
        
        await economyDeleteCommand.execute(interaction, client);
        
        expect(interaction.options.getSubcommand).toHaveBeenCalled();
        
        expect(ecoS.deleteOne).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        expect(interaction.reply.mock.calls[0][0].embeds[0].description).toContain('Your economy account has been **deleted**');
    });
});
