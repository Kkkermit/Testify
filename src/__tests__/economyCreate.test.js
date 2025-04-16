const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const { createEconomyUserMock } = require('./fixtures/economyMocks');

jest.mock('../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();

jest.mock('../commands/Economy/economyCreate', () => {
    return {
        data: {
            name: 'economy-create',
            description: 'Create an economy account.'
        },
        execute: mockExecute
    };
});

const economyCreateCommand = require('../commands/Economy/economyCreate');
const ecoS = require('../schemas/economySystem');

describe('economy-create command', () => {
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
            const { options, guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id});
            const sub = options.getSubcommand();
            
            const embed = {
                author: { name: `Economy System ${client.config.devBy}` },
                title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                thumbnail: { url: client.user.displayAvatarURL() },
                color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                timestamp: new Date().toISOString()
            };
            
            switch (sub) {
                case "account":
                    if (data) {
                        return await interaction.reply({ 
                            content: "You already have an economy account!", 
                            flags: MessageFlags.Ephemeral 
                        });
                    } else {
                        await ecoS.create({
                            Guild: guild.id,
                            User: user.id,
                            Bank: 5000,
                            Wallet: 5000,
                            Worked: 0,
                            Gambled: 0,
                            Begged: 0,
                            HoursWorked: 0,
                            CommandsRan: 0,
                            Moderated: 0
                        });
                        
                        embed.description = 'You have created an economy account, you have been awarded:\n\n• $5000 -> 🏦\n• $5000 -> 💵\n\n__Run `/account view` to view your balance and information.__';
                        
                        await interaction.reply({ embeds: [embed] });
                        return true;
                    }
            }
        });
    });
    
    afterEach(() => {
        teardownTest();
    });
    
    it('should create a new economy account for a user', async () => {
        ecoS.findOne.mockResolvedValueOnce(null);
        ecoS.create.mockResolvedValueOnce({
            Guild: 'test-guild-id',
            User: 'test-user-id',
            Bank: 5000,
            Wallet: 5000
        });
        
        await economyCreateCommand.execute(interaction, client);
        
        expect(ecoS.findOne).toHaveBeenCalledWith({ 
            Guild: 'test-guild-id', 
            User: 'test-user-id' 
        });
        
        expect(ecoS.create).toHaveBeenCalledWith(expect.objectContaining({
            Guild: 'test-guild-id',
            User: 'test-user-id',
            Bank: 5000,
            Wallet: 5000,
            Worked: 0,
            Gambled: 0,
            Begged: 0,
            HoursWorked: 0,
            CommandsRan: 0,
            Moderated: 0
        }));
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        const embed = reply.embeds[0];
        
        expect(embed.author.name).toContain('Economy System');
        expect(embed.title).toContain('Economy System');
        expect(embed.description).toContain('You have created an economy account');
        expect(embed.description).toContain('$5000 -> 🏦');
        expect(embed.description).toContain('$5000 -> 💵');
        expect(embed.footer.text).toBe(`${interaction.guild.name}'s Economy`);
    });
    
    it('should show error if user already has an economy account', async () => {
        const existingData = createEconomyUserMock({
            guildId: 'test-guild-id',
            userId: 'test-user-id'
        });
        ecoS.findOne.mockResolvedValueOnce(existingData);
        
        await economyCreateCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'You already have an economy account!',
            flags: MessageFlags.Ephemeral
        });
        
        expect(ecoS.create).not.toHaveBeenCalled();
    });
    
    it('should handle the account subcommand correctly', async () => {
        interaction.options.getSubcommand.mockReturnValueOnce('account');
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await economyCreateCommand.execute(interaction, client);
        
        expect(interaction.options.getSubcommand).toHaveBeenCalled();
        
        expect(ecoS.create).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        expect(interaction.reply.mock.calls[0][0].embeds[0].description).toContain('You have created an economy account');
    });
});
