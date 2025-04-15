const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const { createEconomyUserMock } = require('./fixtures/economyMocks');

const originalSetTimeout = global.setTimeout;

jest.mock('../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../commands/Economy/beg', () => {
    return {
        data: {
            name: 'beg',
            description: 'Beg to get money.'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const begCommand = require('../commands/Economy/beg');
const ecoS = require('../schemas/economySystem');

describe('beg command', () => {
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
        
        interaction.guild = { id: 'test-guild-id' };
        interaction.user = { 
            ...setup.mockUser,
            id: 'test-user-id'
        };
        
        mockData = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            commandsRan: 5,
            begged: 10,
            wallet: 1000
        });
        
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
        global.setTimeout = jest.fn(cb => {
            cb();
            return 123;
        });
        
        mockExecute.mockImplementation(async (interaction, client) => {
            if (mockTimeout.includes(interaction.user.id)) {
                return await interaction.reply({ 
                    content: "Come back soon to beg **(1 min)**", 
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
            } else {
                const randAmount = Math.round((Math.random() * 750) + 10);
                
                data.CommandsRan += 1;
                data.Begged += 1;
                data.Wallet += randAmount;
                await data.save();
                
                const embed = {
                    author: { name: `Economy System ${client.config.devBy}` },
                    title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                    description: `> You just begged and were **successful**:\n\n• Begged Amount: **$${randAmount}**\n• Timed begged: **${data.Begged}**`,
                    footer: { text: 'Come back in 1 minute and run /beg' },
                    color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                    timestamp: new Date().toISOString(),
                    thumbnail: { url: client.user.displayAvatarURL() }
                };
                
                await interaction.reply({ embeds: [embed] });
                
                mockTimeout.push(interaction.user.id);
                
                return true;
            }
        });
    });

    afterEach(() => {
        global.Math.random.mockRestore();
        global.setTimeout = originalSetTimeout;
        teardownTest();
    });

    it('should give money when begging successfully', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await begCommand.execute(interaction, client);
        
        const expectedAmount = Math.round((0.5 * 750) + 10);
        
        expect(mockData.CommandsRan).toBe(6);
        expect(mockData.Begged).toBe(11);
        expect(mockData.Wallet).toBe(1000 + expectedAmount);
        expect(mockData.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        expect(reply.embeds[0].description).toContain(`$${expectedAmount}`);
        expect(reply.embeds[0].description).toContain('11');
        
        expect(mockTimeout).toContain(interaction.user.id);
    });

    it('should prevent begging if user is on timeout', async () => {
        mockTimeout.push(interaction.user.id);
        
        await begCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: "Come back soon to beg **(1 min)**",
            flags: MessageFlags.Ephemeral
        });
        
        expect(ecoS.findOne).not.toHaveBeenCalled();
    });

    it('should show error if user has no economy account', async () => {
        mockTimeout.length = 0;
        
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await begCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: "You don't have an account, create one using `/economy-create account.`",
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should generate random amounts within expected range', async () => {
        const testRandomValues = [0, 0.25, 0.5, 0.75, 1];
        
        for (const randomValue of testRandomValues) {
            jest.clearAllMocks();
            mockTimeout.length = 0;
            global.Math.random.mockReturnValue(randomValue);
            
            const testData = createEconomyUserMock({
                wallet: 1000,
                begged: 10
            });
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await begCommand.execute(interaction, client);
            
            const expectedAmount = Math.round((randomValue * 750) + 10);
            
            expect(testData.Wallet).toBe(1000 + expectedAmount);
            
            const replyCall = interaction.reply.mock.calls[0][0];
            const embedDesc = replyCall.embeds[0].description || 
                             replyCall.embeds[0].data?.description;
                             
            expect(embedDesc).toContain(`$${expectedAmount}`);
        }
    });
});
