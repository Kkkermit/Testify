const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');
const { createEconomyUserMock } = require('../fixtures/economyMocks');

jest.mock('../../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../../commands/Economy/withdraw', () => {
    return {
        data: {
            name: 'withdraw',
            description: 'Withdraw money from your bank to wallet.'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const withdrawCommand = require('../../commands/Economy/withdraw');
const ecoS = require('../../schemas/economySystem');

describe('withdraw command', () => {
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
            wallet: 1000,
            bank: 5000
        });
        
        interaction.options.getNumber = jest.fn().mockReturnValue(2000);
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { options, guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
            
            const amount = options.getNumber('amount');
            
            if (!data) {
                return await interaction.reply({ 
                    content: "You don't have an account, create one using `economy-create account`", 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                if (data.Bank < amount) {
                    return await interaction.reply({ 
                        content: `Your trying to withdraw **$${amount}** while you only have **$${data.Bank}** available to do so...`
                    });
                }
                
                data.Bank -= amount;
                data.Wallet += amount;
                data.CommandsRan += 1;
                await data.save();
                
                const embed = {
                    author: { name: `Economy System ${client.config.devBy}` },
                    title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                    thumbnail: { url: client.user.displayAvatarURL() },
                    color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                    footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                    description: `You successfully withdrew **$${amount}** to your wallet \n\n• Run \`/account view\` to view your new info.`,
                    timestamp: new Date().toISOString()
                };
                
                await interaction.reply({ embeds: [embed] });
                return true;
            }
        });
    });
    
    afterEach(() => {
        teardownTest();
    });
    
    it('should transfer money from bank to wallet when withdrawing successfully', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await withdrawCommand.execute(interaction, client);
        
        const withdrawalAmount = interaction.options.getNumber('amount');
        
        expect(mockData.CommandsRan).toBe(6);
        expect(mockData.Bank).toBe(5000 - withdrawalAmount);
        expect(mockData.Wallet).toBe(1000 + withdrawalAmount);
        expect(mockData.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(reply.embeds[0].description).toContain(`$${withdrawalAmount}`);
        expect(reply.embeds[0].description).toContain('successfully withdrew');
        expect(reply.embeds[0].footer.text).toBe(`${interaction.guild.name}'s Economy`);
    });
    
    it('should show error if user has no economy account', async () => {
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await withdrawCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You don't have an account"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should show error if user tries to withdraw more than they have in bank', async () => {
        mockData.Bank = 1000;
        
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await withdrawCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("Your trying to withdraw **$2000** while you only have **$1000** available")
        });
        
        expect(mockData.save).not.toHaveBeenCalled();
    });
    
    it('should handle different withdrawal amounts correctly', async () => {
        const testAmounts = [100, 1000, 4999];
        
        for (const amount of testAmounts) {
            jest.clearAllMocks();
            
            const testData = createEconomyUserMock({
                wallet: 1000,
                bank: 5000
            });
            
            interaction.options.getNumber.mockReturnValueOnce(amount);
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await withdrawCommand.execute(interaction, client);
            
            expect(testData.Bank).toBe(5000 - amount);
            expect(testData.Wallet).toBe(1000 + amount);
            
            const replyCall = interaction.reply.mock.calls[0][0];
            expect(replyCall.embeds[0].description).toContain(`$${amount}`);
        }
    });

    it('should allow withdrawal of full bank balance', async () => {
        jest.clearAllMocks();
        
        const testData = createEconomyUserMock({
            wallet: 1000,
            bank: 5000
        });
        
        const fullAmount = 5000;
        interaction.options.getNumber.mockReturnValueOnce(fullAmount);
        
        ecoS.findOne.mockResolvedValueOnce(testData);
        
        await withdrawCommand.execute(interaction, client);
        
        expect(testData.Bank).toBe(0);
        expect(testData.Wallet).toBe(1000 + fullAmount);
        
        const replyCall = interaction.reply.mock.calls[0][0];
        expect(replyCall.embeds[0].description).toContain(`$${fullAmount}`);
    });

    it('should reject withdrawal when amount exceeds bank balance', async () => {
        jest.clearAllMocks();
        
        const testData = createEconomyUserMock({
            wallet: 1000,
            bank: 1000
        });
        
        const excessiveAmount = 2000;
        interaction.options.getNumber.mockReturnValueOnce(excessiveAmount);
        
        ecoS.findOne.mockResolvedValueOnce(testData);
        
        await withdrawCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining(`Your trying to withdraw **$${excessiveAmount}** while you only have **$1000** available`)
        });
        
        expect(testData.save).not.toHaveBeenCalled();
    }); 
});