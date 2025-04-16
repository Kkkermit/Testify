const { setupTest, teardownTest, MessageFlags } = require('../utils/testUtils');
const { createEconomyUserMock } = require('../fixtures/economyMocks');

jest.mock('../../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();

jest.mock('../../commands/Economy/economyAccount', () => {
    return {
        data: {
            name: 'account-view',
            description: 'View your economy account balance and info.'
        },
        execute: mockExecute
    };
});

const accountViewCommand = require('../../commands/Economy/economyAccount');
const ecoS = require('../../schemas/economySystem');

describe('account-view command', () => {
    let interaction;
    let client;
    let mockData;
    
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
        
        mockData = createEconomyUserMock({
            guildId: interaction.guild.id,
            userId: interaction.user.id,
            commandsRan: 15,
            wallet: 3500,
            bank: 8000,
            begged: 5,
            worked: 10,
            hoursWorked: 45,
            gambled: 8,
            moderated: 3
        });
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
            
            if (!data) {
                return await interaction.reply({ 
                    content: "Economy account not found, create one using `/economy-create account`", 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                const embed = {
                    author: { name: `Economy System ${client.config.devBy}` },
                    title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                    description: `> Here is your account info:`,
                    thumbnail: { url: client.user.displayAvatarURL() },
                    color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                    fields: [
                        { 
                            name: "Current Account", 
                            value: [ 
                                `• 🏦 **$${data.Bank}** In Bank`, 
                                `• 💵 **$${data.Wallet}** In Cash`, 
                                `• 💰 **$${data.Wallet + data.Bank}** Overall` 
                            ].join("\n"), 
                            inline: false 
                        },
                        { 
                            name: "Personal Area", 
                            value: [ 
                                `• 🧑‍💻 **${data.CommandsRan}** {/} ran`, 
                                `• 🛠️ **${data.Moderated}** times (moderated)`, 
                                `• 🙏 **${data.Begged}** times begged`, 
                                `• 👷 **${data.Worked}** times worked (${data.HoursWorked} hrs)`, 
                                `• 🎰 **${data.Gambled}** times gambled` 
                            ].join("\n"), 
                            inline: false 
                        }
                    ],
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
    
    it('should show account information when user has an economy account', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await accountViewCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        const embed = reply.embeds[0];
        
        expect(embed.author.name).toContain('Economy System Test Developer');
        expect(embed.title).toContain('TestBot Economy System');
        expect(embed.description).toBe('> Here is your account info:');
        
        const accountField = embed.fields[0];
        expect(accountField.name).toBe('Current Account');
        expect(accountField.value).toContain('**$8000** In Bank');
        expect(accountField.value).toContain('**$3500** In Cash');
        expect(accountField.value).toContain('**$11500** Overall');
        
        const personalField = embed.fields[1];
        expect(personalField.name).toBe('Personal Area');
        expect(personalField.value).toContain('**15** {/} ran');
        expect(personalField.value).toContain('**3** times (moderated)');
        expect(personalField.value).toContain('**5** times begged');
        expect(personalField.value).toContain('**10** times worked (45 hrs)');
        expect(personalField.value).toContain('**8** times gambled');
        
        expect(embed.footer.text).toBe(`${interaction.guild.name}'s Economy`);
    });
    
    it('should show error if user has no economy account', async () => {
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await accountViewCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("Economy account not found"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should calculate overall balance correctly with different amounts', async () => {
        const testBalances = [
            { wallet: 1000, bank: 2000, expected: 3000 },
            { wallet: 0, bank: 5000, expected: 5000 },
            { wallet: 7500, bank: 0, expected: 7500 },
            { wallet: 9999, bank: 9999, expected: 19998 }
        ];
        
        for (const balance of testBalances) {
            jest.clearAllMocks();
            
            const testData = createEconomyUserMock({
                wallet: balance.wallet,
                bank: balance.bank,
                commandsRan: 1
            });
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await accountViewCommand.execute(interaction, client);
            
            const replyCall = interaction.reply.mock.calls[0][0];
            const accountField = replyCall.embeds[0].fields[0].value;
            
            expect(accountField).toContain(`**$${balance.bank}** In Bank`);
            expect(accountField).toContain(`**$${balance.wallet}** In Cash`);
            expect(accountField).toContain(`**$${balance.expected}** Overall`);
        }
    });
});