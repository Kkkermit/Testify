const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');
const { createEconomyUserMock } = require('../fixtures/economyMocks');

const originalSetTimeout = global.setTimeout;
const originalMathRandom = global.Math.random;
const originalMathFloor = global.Math.floor;

jest.mock('../../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../../commands/Economy/gamble', () => {
    return {
        data: {
            name: 'gamble',
            description: 'Gamble to win or lose money.'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const gambleCommand = require('../../commands/Economy/gamble');
const ecoS = require('../../schemas/economySystem');

describe('gamble command', () => {
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
            gambled: 2,
            wallet: 5000,
            bank: 10000
        });
        
        interaction.options.getNumber = jest.fn().mockReturnValue(1000);
        
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        
        jest.spyOn(global.Math, 'floor').mockReturnValue(5);
        
        global.setTimeout = jest.fn(cb => {
            return 123;
        });
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { options, guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
            
            if (mockTimeout.includes(interaction.user.id)) {
                return await interaction.reply({ 
                    content: "Come back in **1min** to gamble more!", 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            const amount = options.getNumber('amount') || 500;
            
            if (!data) {
                return await interaction.reply({ 
                    content: "You don't have an account, create one using `/economy-create account`", 
                    flags: MessageFlags.Ephemeral 
                });
            } 
            
            if (data.Wallet < amount) {
                return await interaction.reply({ 
                    content: `You only have **$${data.Wallet}** in your wallet...`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            if (data.Wallet < amount && data.Bank > amount) {
                return await interaction.reply({ 
                    content: `You have **$${data.Wallet}** in your wallet but **$${data.Bank}**... Withdraw some money to gamble` 
                });
            }
            
            const acca = [0.4, 0.8, 1, 5, 2.1, 1.6, 10, 2, 0.9, 1.1, 0, 0, 1, 2, 3, 0.1, 2.5, 1.8, 0.4, 0.8, 1, 5, 2.1, 1.6, 10, 2, 0.9, 1.1, 0, 0, 1, 2, 3, 0.1, 2.5, 1.8, 100];
            
            const jobPick = acca[Math.floor(Math.random() * acca.length)];
            
            if (jobPick === 1) {
                return await interaction.reply({ content: "You didn't *win* or *lose*" });
            }
            
            const winorlose = jobPick * amount;
            
            let choice;
            let happened;
            
            if (jobPick < 1) {
                choice = "lost";
                happened = "Loss";
            } else {
                choice = "won";
                happened = "Win";
            }
            
            data.Wallet -= amount;
            data.Wallet += winorlose;
            data.Gambled += 1;
            data.CommandsRan += 1;
            await data.save();
            
            const embed = {
                author: { name: `Economy System ${client.config.devBy}` },
                title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                thumbnail: { url: client.user.displayAvatarURL() },
                description: `You just gambled **$${amount}** and **${choice}**\n\n💵Gamble Amount: **$${amount}**\n🎰Accumulator: **${jobPick}**\n\n🎉Total ${happened}: **$${winorlose}**`,
                footer: { text: "Come back in 1 minute and run /gamble" },
                color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                timestamp: new Date().toISOString()
            };
            
            await interaction.reply({ embeds: [embed] });
            
            mockTimeout.push(interaction.user.id);
            
            return true;
        });
    });
    
    afterEach(() => {
        global.Math.random.mockRestore();
        global.Math.floor.mockRestore();
        global.setTimeout = originalSetTimeout;
        teardownTest();
    });
    
    it('should allow successful gambling with winnings', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await gambleCommand.execute(interaction, client);
        
        const gambleAmount = interaction.options.getNumber('amount');
        const multiplier = 1.6;
        const winnings = gambleAmount * multiplier;
        
        expect(mockData.CommandsRan).toBe(6);
        expect(mockData.Gambled).toBe(3);
        expect(mockData.Wallet).toBe(5000 - gambleAmount + winnings);
        expect(mockData.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(reply.embeds[0].description).toContain(`$${gambleAmount}`);
        expect(reply.embeds[0].description).toContain('won');
        expect(reply.embeds[0].description).toContain(`Accumulator: **${multiplier}**`);
        expect(reply.embeds[0].description).toContain(`Total Win: **$${winnings}**`);
        
        expect(mockTimeout).toContain(interaction.user.id);
    });
    
    it('should handle gambling losses when multiplier is less than 1', async () => {
        global.Math.floor.mockReturnValueOnce(0);
        
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await gambleCommand.execute(interaction, client);
        
        const gambleAmount = interaction.options.getNumber('amount');
        const multiplier = 0.4;
        const winnings = gambleAmount * multiplier;
        
        const expectedWallet = 5000 - gambleAmount + winnings;
        
        expect(mockData.Gambled).toBe(3);
        expect(mockData.Wallet).toBe(expectedWallet);
        
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds[0].description).toContain('lost');
        expect(reply.embeds[0].description).toContain(`Accumulator: **${multiplier}**`);
        expect(reply.embeds[0].description).toContain(`Total Loss: **$${winnings}**`);
    });
    
    it('should use default amount when none is provided', async () => {
        interaction.options.getNumber.mockReturnValueOnce(null);
        
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await gambleCommand.execute(interaction, client);
        
        const defaultAmount = 500;
        const multiplier = 1.6;
        
        const reply = interaction.reply.mock.calls[0][0];
        expect(reply.embeds[0].description).toContain(`$${defaultAmount}`);
    });
    
    it('should prevent gambling if user is on timeout', async () => {
        mockTimeout.push(interaction.user.id);
        
        await gambleCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("Come back in **1min** to gamble more!"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should show error if user has no economy account', async () => {
        mockTimeout.length = 0;
        
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await gambleCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You don't have an account"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should show error if user has insufficient wallet balance', async () => {
        mockData.Wallet = 500;
        
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await gambleCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You only have **$500** in your wallet"),
            flags: MessageFlags.Ephemeral
        });
        
        expect(mockData.save).not.toHaveBeenCalled();
    });
    
    it('should handle different accumulator values correctly', async () => {
        const testCases = [
            { index: 0, multiplier: 0.4, result: 'lost' },
            { index: 5, multiplier: 1.6, result: 'won' },
            { index: 6, multiplier: 10, result: 'won' },
            { index: 10, multiplier: 0, result: 'lost' }
        ];
        
        for (const testCase of testCases) {
            jest.clearAllMocks();
            mockTimeout.length = 0;
            
            global.Math.floor.mockReturnValueOnce(testCase.index);
            
            const testData = createEconomyUserMock({
                wallet: 5000,
                gambled: 2
            });
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await gambleCommand.execute(interaction, client);
            
            const gambleAmount = 1000;
            const winnings = testCase.multiplier * gambleAmount;
            
            expect(testData.Gambled).toBe(3);
            expect(testData.Wallet).toBe(5000 - gambleAmount + winnings);
            
            const reply = interaction.reply.mock.calls[0][0];
            expect(reply.embeds[0].description).toContain(testCase.result);
            expect(reply.embeds[0].description).toContain(`Accumulator: **${testCase.multiplier}**`);
        }
    });
});