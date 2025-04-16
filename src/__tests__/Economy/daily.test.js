const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');
const { createEconomyUserMock } = require('../fixtures/economyMocks');

const originalSetTimeout = global.setTimeout;

jest.mock('../../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../../commands/Economy/daily', () => {
    return {
        data: {
            name: 'daily',
            description: 'Claim your daily boost.'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const dailyCommand = require('../../commands/Economy/daily');
const ecoS = require('../../schemas/economySystem');

describe('daily command', () => {
    let interaction;
    let client;
    let mockData;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockTimeout.length = 0;
        
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
        
        mockData = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            commandsRan: 5,
            bank: 2000
        });
        
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        
        global.setTimeout = jest.fn((callback) => {
            callback();
            return 123;
        });
        
        mockExecute.mockImplementation(async (interaction, client) => {
            if (mockTimeout.includes(interaction.user.id)) {
                return await interaction.reply({ 
                    content: "You've already used `/daily` today. Come back in **24hrs**", 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            const { guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
            
            if (!data) {
                return await interaction.reply({ 
                    content: "You don't have an account, create one using `/economy-create account.`", 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            const randAmount = Math.round((Math.random() * 3000) + 10);
            
            data.Bank += randAmount;
            data.CommandsRan += 1;
            await data.save();
            
            const embed = {
                author: { name: `Economy System ${client.config.devBy}` },
                title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                thumbnail: { url: client.user.displayAvatarURL() },
                color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                description: `> You claimed your daily boost!\n\n• Amount: **$${randAmount}**\n• Next claim available: **24 hours**`,
                footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                timestamp: new Date().toISOString()
            };
            
            await interaction.reply({ embeds: [embed] });
            
            mockTimeout.push(interaction.user.id);
            
            return true;
        });
    });
    
    afterEach(() => {
        global.Math.random.mockRestore();
        global.setTimeout = originalSetTimeout;
        teardownTest();
    });
    
    it('should give daily reward when claimed successfully', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await dailyCommand.execute(interaction, client);
        
        const expectedAmount = Math.round((0.5 * 3000) + 10);
        
        expect(mockData.CommandsRan).toBe(6);
        expect(mockData.Bank).toBe(2000 + expectedAmount);
        expect(mockData.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(reply.embeds[0].description).toContain(`$${expectedAmount}`);
        expect(reply.embeds[0].description).toContain('You claimed your daily boost');
        expect(reply.embeds[0].footer.text).toBe(`${interaction.guild.name}'s Economy`);
        
        expect(mockTimeout).toContain(interaction.user.id);
    });
    
    it('should prevent claiming reward if user is on timeout', async () => {
        mockTimeout.push(interaction.user.id);
        
        await dailyCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You've already used `/daily` today"),
            flags: MessageFlags.Ephemeral
        });
        
        expect(ecoS.findOne).not.toHaveBeenCalled();
    });
    
    it('should show error if user has no economy account', async () => {
        mockTimeout.length = 0;
        
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await dailyCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You don't have an account"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should generate random reward amounts within expected range', async () => {
        const testRandomValues = [0, 0.25, 0.5, 0.75, 1];
        
        for (const randomValue of testRandomValues) {
            jest.clearAllMocks();
            mockTimeout.length = 0;
            global.Math.random.mockReturnValue(randomValue);
            
            const testData = createEconomyUserMock({
                bank: 2000
            });
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await dailyCommand.execute(interaction, client);
            
            const expectedAmount = Math.round((randomValue * 3000) + 10);
            
            expect(testData.Bank).toBe(2000 + expectedAmount);
            
            const replyCall = interaction.reply.mock.calls[0][0];
            expect(replyCall.embeds[0].description).toContain(`$${expectedAmount}`);
        }
    });
});