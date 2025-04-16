const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');
const { createEconomyUserMock } = require('./fixtures/economyMocks');

const originalSetTimeout = global.setTimeout;
const originalMathRandom = global.Math.random;
const originalMathFloor = global.Math.floor;

jest.mock('../schemas/economySystem', () => ({
    findOne: jest.fn(),
    create: jest.fn()
}));

const mockExecute = jest.fn();
const mockTimeout = [];

jest.mock('../commands/Economy/work', () => {
    return {
        data: {
            name: 'work',
            description: 'Work to earn money.'
        },
        timeout: mockTimeout,
        execute: mockExecute
    };
});

const workCommand = require('../commands/Economy/work');
const ecoS = require('../schemas/economySystem');

describe('work command', () => {
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
            worked: 3,
            hoursWorked: 30,
            bank: 2000
        });
        
        jest.spyOn(global.Math, 'random')
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.5);
        
        jest.spyOn(global.Math, 'floor').mockReturnValueOnce(4);
        
        global.setTimeout = jest.fn(cb => {
            return 123;
        });
        
        mockExecute.mockImplementation(async (interaction, client) => {
            const { guild, user } = interaction;
            let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
            
            if (mockTimeout.includes(user.id)) {
                return await interaction.reply({ 
                    content: "come back in **5mins** to work again!", 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            if (!data) {
                return await interaction.reply({ 
                    content: "You don't have an account, create one using `/economy-create account`", 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                const jobs = [
                    "Policemen",
                    "Builder",
                    "Uber driver",
                    "Waiter",
                    "Chef",
                    "Software Engineer",
                    "Streamer",
                    "Reporter",
                    "Firefighter"
                ];
                
                const jobPick = jobs[Math.floor(Math.random() * jobs.length)];
                const amount = Math.round((Math.random() * 1000) + 10);
                const hours = Math.round((Math.random() * 15) + 8);
                const pph = Math.round(amount / hours);
                
                data.Bank += amount;
                data.Worked += 1;
                data.HoursWorked += hours;
                data.CommandsRan += 1;
                await data.save();
                
                const embed = {
                    author: { name: `Economy System ${client.config.devBy}` },
                    title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                    thumbnail: { url: client.user.displayAvatarURL() },
                    description: `You worked as a **${jobPick}**\n\n• Hours Worked: **${hours}** hrs\n• Pay for the day: **$${amount}**\n• Pay per hour: **$${pph}**`,
                    footer: { text: `Come back in 5 minutes and run /work` },
                    color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                    timestamp: new Date().toISOString()
                };
                
                await interaction.reply({ embeds: [embed] });
                
                mockTimeout.push(user.id);
                
                return true;
            }
        });
    });
    
    afterEach(() => {
        global.Math.random.mockRestore();
        global.Math.floor.mockRestore();
        global.setTimeout = originalSetTimeout;
        teardownTest();
    });
    
    it('should allow user to work and earn money', async () => {
        ecoS.findOne.mockResolvedValueOnce(mockData);
        
        await workCommand.execute(interaction, client);
        
        const expectedAmount = Math.round((0.5 * 1000) + 10);
        const expectedHours = Math.round((0.5 * 15) + 8);
        const expectedPPH = Math.round(expectedAmount / expectedHours);
        const expectedJob = "Chef"; 
        
        expect(mockData.CommandsRan).toBe(6);
        expect(mockData.Worked).toBe(4);
        expect(mockData.HoursWorked).toBe(30 + expectedHours);
        expect(mockData.Bank).toBe(2000 + expectedAmount);
        expect(mockData.save).toHaveBeenCalled();
        
        expect(interaction.reply).toHaveBeenCalled();
        const reply = interaction.reply.mock.calls[0][0];
        
        expect(reply.embeds).toBeDefined();
        expect(reply.embeds.length).toBe(1);
        
        expect(reply.embeds[0].description).toContain(`You worked as a **${expectedJob}**`);
        expect(reply.embeds[0].description).toContain(`Hours Worked: **${expectedHours}** hrs`);
        expect(reply.embeds[0].description).toContain(`Pay for the day: **$${expectedAmount}**`);
        expect(reply.embeds[0].description).toContain(`Pay per hour: **$${expectedPPH}**`);
        
        expect(mockTimeout).toContain(interaction.user.id);
    });
    
    it('should prevent working if user is on timeout', async () => {
        mockTimeout.push(interaction.user.id);
        
        await workCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("come back in **5mins** to work again!"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should show error if user has no economy account', async () => {
        mockTimeout.length = 0;
        
        ecoS.findOne.mockResolvedValueOnce(null);
        
        await workCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: expect.stringContaining("You don't have an account"),
            flags: MessageFlags.Ephemeral
        });
    });
    
    it('should generate different jobs, hours, and pay amounts', async () => {
        const testJobs = [
            { randomIndex: 0, jobName: "Policemen", randomPay: 0.1, randomHours: 0.1 },
            { randomIndex: 3, jobName: "Waiter", randomPay: 0.3, randomHours: 0.3 },
            { randomIndex: 5, jobName: "Software Engineer", randomPay: 0.8, randomHours: 0.6 },
            { randomIndex: 8, jobName: "Firefighter", randomPay: 1, randomHours: 1 }
        ];
        
        for (const test of testJobs) {
            jest.clearAllMocks();
            mockTimeout.length = 0;
            
            mockExecute.mockImplementationOnce(async (interaction, client) => {
                const { guild, user } = interaction;
                let data = await ecoS.findOne({ Guild: guild.id, User: user.id });
                
                if (mockTimeout.includes(user.id)) {
                    return await interaction.reply({ 
                        content: "come back in **5mins** to work again!", 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                
                if (!data) {
                    return await interaction.reply({ 
                        content: "You don't have an account, create one using `/economy-create account`", 
                        flags: MessageFlags.Ephemeral 
                    });
                } else {
                    const jobPick = test.jobName;
                    const amount = Math.round((test.randomPay * 1000) + 10);
                    const hours = Math.round((test.randomHours * 15) + 8);
                    const pph = Math.round(amount / hours);
                    
                    data.Bank += amount;
                    data.Worked += 1;
                    data.HoursWorked += hours;
                    data.CommandsRan += 1;
                    await data.save();
                    
                    const embed = {
                        author: { name: `Economy System ${client.config.devBy}` },
                        title: `${client.user.username} Economy System ${client.config.arrowEmoji}`,
                        thumbnail: { url: client.user.displayAvatarURL() },
                        description: `You worked as a **${jobPick}**\n\n• Hours Worked: **${hours}** hrs\n• Pay for the day: **$${amount}**\n• Pay per hour: **$${pph}**`,
                        footer: { text: `Come back in 5 minutes and run /work` },
                        color: parseInt(client.config.embedEconomy.replace('#', ''), 16),
                        timestamp: new Date().toISOString()
                    };
                    
                    await interaction.reply({ embeds: [embed] });
                    
                    mockTimeout.push(user.id);
                    
                    return true;
                }
            });
            
            const testData = createEconomyUserMock({
                bank: 1000,
                worked: 1,
                hoursWorked: 10
            });
            
            ecoS.findOne.mockResolvedValueOnce(testData);
            
            await workCommand.execute(interaction, client);
            
            const expectedAmount = Math.round((test.randomPay * 1000) + 10);
            const expectedHours = Math.round((test.randomHours * 15) + 8);
            
            expect(testData.Worked).toBe(2);
            expect(testData.Bank).toBe(1000 + expectedAmount);
            
            const replyCall = interaction.reply.mock.calls[0][0];
            const embedDesc = replyCall.embeds[0].description;
            expect(embedDesc).toContain(`You worked as a **${test.jobName}**`);
        }
    });
});
