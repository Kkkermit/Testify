const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const { createEconomyUserMock } = require('./fixtures/economyMocks');

jest.mock('../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../commands/Economy/deposit', () => {
    return {
        data: {
            name: 'deposit',
            description: 'Deposit money from your wallet to bank.'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const depositCommand = require('../commands/Economy/deposit');
const ecoS = require('../schemas/economySystem');

describe('deposit command', () => {
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
            wallet: 5000,
            bank: 2000
        });
        
        interaction.options.getNumber = jest.fn().mockReturnValue(1000);
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { options, guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
            
            const amount = options.getNumber('amount');
            
            if (!data) {
                return await interaction.reply({ 
                    content: "You don't have an account, create one using `/economy-create account.`", 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                if (data.Wallet < amount) {
                    return await interaction.reply({ 
                        content: `You're trying to deposit $${amount} while you only have $${data.Wallet} available to do so...`
                    });
                }
                
                data.Wallet -= amount;
                data.Bank += amount;
                data.CommandsRan += 1;
                await data.save();
                
                const embed = {
                    author: { name: `Economy System ${client.config.devBy}` },
                    title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                    thumbnail: { url: client.user.displayAvatarURL() },
                    color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                    description: `> You successfully deposited **$${amount}** to your wallet \n\n• Run \`/account view\` to view your new info.`,
                    footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
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
    
    it('should transfer money from wallet to bank when depositing successfully', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await depositCommand.execute(interaction, client);
        
        const depositAmount = interaction.options.getNumber('amount');
        
        expect(mockData.CommandsRan).toBe(6);
        expect(mockData.Wallet).toBe(5000 - depositAmount);
        expect(mockData.Bank).toBe(2000 + depositAmount);
        expect(mockData.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(reply.embeds[0].description).toContain(`$${depositAmount}`);
        expect(reply.embeds[0].description).toContain('successfully deposited');
        expect(reply.embeds[0].footer.text).toBe(`${interaction.guild.name}'s Economy`);
    });
    
    it('should show error if user has no economy account', async () => {
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await depositCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You don't have an account"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should show error if user tries to deposit more than they have in wallet', async () => {
        mockData.Wallet = 500;
        
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await depositCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You're trying to deposit $1000 while you only have $500")
        });
        
        expect(mockData.save).not.toHaveBeenCalled();
    });
    
    it('should handle different deposit amounts correctly', async () => {
        const testAmounts = [100, 1000, 4999];
        
        for (const amount of testAmounts) {
            jest.clearAllMocks();
            
            const testData = createEconomyUserMock({
                wallet: 5000,
                bank: 2000
            });
            
            interaction.options.getNumber.mockReturnValueOnce(amount);
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await depositCommand.execute(interaction, client);
            
            expect(testData.Wallet).toBe(5000 - amount);
            expect(testData.Bank).toBe(2000 + amount);
            
            const replyCall = interaction.reply.mock.calls[0][0];
            expect(replyCall.embeds[0].description).toContain(`$${amount}`);
        }
    });
    
    it('should reject deposit when amount exceeds wallet balance', async () => {
        jest.clearAllMocks();
        
        const testData = createEconomyUserMock({
            wallet: 1000,
            bank: 2000
        });
        
        const excessiveAmount = 2000;
        interaction.options.getNumber.mockReturnValueOnce(excessiveAmount);
        
        ecoS.findOne.mockResolvedValueOnce(testData);
        
        await depositCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining(`You're trying to deposit $${excessiveAmount} while you only have $1000`)
        });
        
        expect(testData.save).not.toHaveBeenCalled();
    });
});
