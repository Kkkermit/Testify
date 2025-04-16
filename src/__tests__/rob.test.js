const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const { createEconomyUserMock } = require('./fixtures/economyMocks');

const originalSetTimeout = global.setTimeout;
const originalMathRandom = global.Math.random;
const originalMathFloor = global.Math.floor;

jest.mock('../schemas/economySystem', () => ({
    findOne: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../commands/Economy/rob', () => {
    return {
        data: {
            name: 'rob',
            description: 'Rob a person money'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const robCommand = require('../commands/Economy/rob');
const ecoSchema = require('../schemas/economySystem');

describe('rob command', () => {
    let interaction;
    let client;
    let userWallet;
    let targetUserWallet;
    
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

        const targetUser = { 
            id: 'target-user-id',
            username: 'TargetUser',
            displayAvatarURL: jest.fn().mockReturnValue('https://example.com/target-avatar.png')
        };
        
        interaction.options.getUser = jest.fn().mockReturnValue(targetUser);
        
        userWallet = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            wallet: 1000,
            bank: 5000
        });
        
        targetUserWallet = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: targetUser.id,
            wallet: 2000,
            bank: 3000
        });

        jest.spyOn(global.Math, 'random')
            .mockReturnValueOnce(0.5) 
            .mockReturnValueOnce(0.3);
        
        jest.spyOn(global.Math, 'floor')
            .mockReturnValueOnce(0) 
            .mockReturnValueOnce(2);
        
        global.setTimeout = jest.fn(cb => {
            return 123;
        });
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { options, user, guild } = interaction;
            
            if (mockTimeout.includes(user.id)) {
                return await interaction.reply({ 
                    content: 'You need to wait **1min** to rob another user again', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const userStealing = options.getUser('user');
            
            let Data = await ecoSchema.findOne({ Guild: guild.id, User: user.id });
            let DataUser = await ecoSchema.findOne({ Guild: guild.id, User: userStealing.id });
            
            if (!Data) {
                return await interaction.reply({ 
                    content: "You don't have an account, create one using `/economy-create account`", 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            if (userStealing.id === user.id) {
                return await interaction.reply({ 
                    content: 'You **cannot** rob yourself!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            if (!DataUser) {
                return await interaction.reply({ 
                    content: 'That user **does not** have an economy account created', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            if (DataUser.Wallet <= 0) {
                return await interaction.reply({ 
                    content: 'That user **does not** have any money in their wallet', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            if (Data.Wallet <= 0) {
                return await interaction.reply({ 
                    content: 'You **cannot** rob this person because your wallet has **$0** in it', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            let negative = Math.round((Math.random() * -150) - 10);
            let positive = Math.round((Math.random() * 300) - 10);
            
            const posN = [negative, positive];
            const amount = Math.floor(Math.random() * posN.length);
            const value = posN[amount];
            
            if (value > 0) {
                const positiveChoices = [
                    "You stole",
                    "The owner saw you and helped you rob",
                    "You robbed",
                    "You took",
                    "You successfully robbed",
                    "You Beat the person and took",
                    "You robbed the person and ran away with",
                    "You hacked into the person's bank account and took",
                ];
                
                const posName = Math.floor(Math.random() * positiveChoices.length);
                
                const embed = {
                    color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                    author: { name: `Economy System ${client.config.devBy}` },
                    title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                    fields: [{ name: '> You robbed and', value: `• ${positiveChoices[posName]} $${value}` }],
                    footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                    thumbnail: { url: client.user.avatarURL() },
                    timestamp: new Date().toISOString()
                };
                
                Data.Wallet += value;
                await Data.save();
                
                DataUser.Wallet -= value;
                await DataUser.save();
                
                await interaction.reply({ embeds: [embed] });
            } else if (value < 0) {
                const negativeChoices = [
                    "You got caught by the cops and lost",
                    "You left your ID and got arrested, you lost",
                    "The person knocked you out and took",
                    "The person saw you and took",
                    "The person caught you and took",
                    "The person beat you up and took",
                    "The person called the cops and you lost",
                ];
                
                const wal = Data.Wallet;
                
                if (isNaN(value)) {
                    return await interaction.reply({ 
                        content: "This user called the cops on you, but you ran away. You didn't lose or gain anything", 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                
                const negName = Math.floor(Math.random() * negativeChoices.length);
                
                let embed;
                if (value - wal < 0) {
                    const stringV = `${value}`;
                    const nonSymbol = stringV.slice(1);
                    
                    embed = {
                        color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                        title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                        author: { name: `Economy System ${client.config.devBy}` },
                        fields: [{ name: '> You robbed and', value: `• ${negativeChoices[negName]} $${nonSymbol}` }],
                        footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                        thumbnail: { url: client.user.avatarURL() },
                        timestamp: new Date().toISOString()
                    };
                    
                    Data.Bank += value;
                    await Data.save();
                    
                    DataUser.Wallet -= value;
                    await DataUser.save();
                } else {
                    embed = {
                        color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                        title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                        author: { name: `Economy System ${client.config.devBy}` },
                        fields: [{ name: '> You robbed and', value: `• ${negativeChoices[negName]} $${value}` }],
                        footer: { text: `${guild.name}'s Economy`, iconURL: guild.iconURL() },
                        thumbnail: { url: client.user.avatarURL() },
                        timestamp: new Date().toISOString()
                    };
                    
                    Data.Wallet += value;
                    await Data.save();
                    
                    DataUser.Wallet -= value;
                    await DataUser.save();
                }
                
                await interaction.reply({ embeds: [embed] });
            }
            
            mockTimeout.push(user.id);
            
            return true;
        });
    });
    
    afterEach(() => {
        global.Math.random.mockRestore();
        global.Math.floor.mockRestore();
        global.setTimeout = originalSetTimeout;
        teardownTest();
    });
    
    it('should successfully rob another user when value is positive', async () => {
        const positiveValue = 200;
        global.Math.random
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.3);
            
        global.Math.floor
            .mockReturnValueOnce(1)
            .mockReturnValueOnce(2);
            
        ecoSchema.findOne.mockImplementation((query) => {
            if (query.User === 'test-user-id') return userWallet;
            if (query.User === 'target-user-id') return targetUserWallet;
            return null;
        });
        
        await robCommand.execute(interaction, client);
        
        expect(userWallet.save).toHaveBeenCalled();
        expect(targetUserWallet.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(mockTimeout).toContain(interaction.user.id);
    });
    
    it('should fail robbery when value is negative', async () => {
        const negativeValue = -100;
        global.Math.random
            .mockReturnValueOnce(0.2)
            .mockReturnValueOnce(0.1); 
            
        global.Math.floor
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(1);
            
        ecoSchema.findOne.mockImplementation((query) => {
            if (query.User === 'test-user-id') return userWallet;
            if (query.User === 'target-user-id') return targetUserWallet;
            return null;
        });
        
        await robCommand.execute(interaction, client);
        
        expect(userWallet.save).toHaveBeenCalled();
        expect(targetUserWallet.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(mockTimeout).toContain(interaction.user.id);
    });
    
    it('should prevent robbing if user is on timeout', async () => {
        mockTimeout.push(interaction.user.id);
        
        await robCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You need to wait **1min** to rob another user again"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should prevent robbing if user has no economy account', async () => {
        ecoSchema.findOne.mockImplementation((query) => {
            if (query.User === 'test-user-id') return null;
            if (query.User === 'target-user-id') return targetUserWallet;
            return null;
        });
        
        await robCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You don't have an account"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should prevent robbing if target has no economy account', async () => {
        ecoSchema.findOne.mockImplementation((query) => {
            if (query.User === 'test-user-id') return userWallet;
            if (query.User === 'target-user-id') return null;
            return null;
        });
        
        await robCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("That user **does not** have an economy account created"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should prevent robbing if target has no money', async () => {
        const emptyWallet = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: 'target-user-id',
            wallet: 0,
            bank: 3000
        });
        
        ecoSchema.findOne.mockImplementation((query) => {
            if (query.User === 'test-user-id') return userWallet;
            if (query.User === 'target-user-id') return emptyWallet;
            return null;
        });
        
        await robCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("That user **does not** have any money in their wallet"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should prevent robbing if user has no money', async () => {
        const emptyWallet = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: 'test-user-id',
            wallet: 0,
            bank: 5000
        });
        
        ecoSchema.findOne.mockImplementation((query) => {
            if (query.User === 'test-user-id') return emptyWallet;
            if (query.User === 'target-user-id') return targetUserWallet;
            return null;
        });
        
        await robCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You **cannot** rob this person because your wallet has **$0** in it"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should prevent user from robbing themselves', async () => {
        interaction.options.getUser.mockReturnValueOnce(interaction.user);
        
        await robCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You **cannot** rob yourself!"),
            flags: MessageFlags.Ephemeral
        });
    });
});
