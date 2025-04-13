const countingCommand = require('../commands/Counting/countingSetup');
const { setupTest, teardownTest, MessageFlags, PermissionsBitField, ChannelType } = require('./utils/testUtils');

jest.mock('../schemas/countingSystem.js', () => {
    return {
        findOne: jest.fn((query, callback) => {
            if (callback) {
                return callback(null, mockSchemaData);
            }
            return Promise.resolve(mockSchemaData);
        }),
        create: jest.fn(data => {
            mockSchemaData = { ...data };
            return mockSchemaData;
        }),
        deleteMany: jest.fn((query, callback) => {
            mockSchemaData = null;
            if (callback) callback(null, { deletedCount: 1 });
            return Promise.resolve({ deletedCount: 1 });
        })
    };
});

let mockSchemaData = null;

describe('counting command', () => {
    let interaction;
    let client;
    let mockTextChannel;

    beforeEach(() => {
        mockSchemaData = null;
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        
        client.config.embedFun = '#FF69B4'; 
        client.config.countSuccessEmoji = '✅';
        
        mockTextChannel = {
            id: 'counting-channel-123',
            name: 'counting',
            type: ChannelType.GuildText,
            send: jest.fn().mockResolvedValue({ react: jest.fn() })
        };
        
        interaction.guild = { id: 'test-guild-123' };
        interaction.options.getSubcommand = jest.fn();
        interaction.options.getChannel = jest.fn().mockReturnValue(mockTextChannel);
        interaction.options.getInteger = jest.fn();
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
    });

    describe('setup subcommand', () => {
        it('should set up the counting system in the specified channel', async () => {
            interaction.options.getSubcommand.mockReturnValue('setup');
            interaction.member.permissions.has.mockReturnValue(true);
            interaction.options.getInteger.mockReturnValue(500);

            await countingCommand.execute(interaction, client);

            expect(require('../schemas/countingSystem').findOne).toHaveBeenCalledWith(
                { Guild: 'test-guild-123' },
                expect.any(Function)
            );
            
            expect(interaction.reply).toHaveBeenCalled();
            const replyCall = interaction.reply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
            expect(replyCall.embeds.length).toBe(1);
            
            const embed = replyCall.embeds[0].data;
            expect(embed).toBeDefined();
            expect(embed.title).toBe('TestBot Counting System ➡️');
            expect(embed.description).toContain('successfully');
            expect(embed.description).toContain('500');
            expect(embed.footer.text).toBe('Counting System Setup');
            
            expect(mockTextChannel.send).toHaveBeenCalled();
            const channelMessage = mockTextChannel.send.mock.calls[0][0];
            expect(channelMessage.embeds).toBeDefined();
            expect(channelMessage.embeds.length).toBe(1);
            
            const channelEmbed = channelMessage.embeds[0].data;
            expect(channelEmbed.description).toContain('enabled');
        });

        it('should use default max count when not specified', async () => {
            interaction.options.getSubcommand.mockReturnValue('setup');
            interaction.member.permissions.has.mockReturnValue(true);
            interaction.options.getInteger.mockReturnValue(null);
            
            await countingCommand.execute(interaction, client);
            
            expect(require('../schemas/countingSystem').create).toHaveBeenCalledWith(
                expect.objectContaining({
                    MaxCount: 1000
                })
            );
        });

        it('should prevent setup if counting system already exists', async () => {
            mockSchemaData = {
                Guild: 'test-guild-123',
                Channel: 'existing-channel-456',
                Count: 0,
                MaxCount: 1000
            };
            
            interaction.options.getSubcommand.mockReturnValue('setup');
            interaction.member.permissions.has.mockReturnValue(true);
            
            await countingCommand.execute(interaction, client);
            
            expect(interaction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('already have a counting system'),
                flags: MessageFlags.Ephemeral
            });
            
            expect(require('../schemas/countingSystem').create).not.toHaveBeenCalled();
        });
    });

    describe('disable subcommand', () => {
        it('should disable the counting system', async () => {
            interaction.options.getSubcommand.mockReturnValue('disable');
            interaction.member.permissions.has.mockReturnValue(true);
            
            mockSchemaData = {
                Guild: 'test-guild-123',
                Channel: 'existing-channel-456',
                Count: 42,
                MaxCount: 1000
            };
            
            await countingCommand.execute(interaction, client);
            
            expect(require('../schemas/countingSystem').deleteMany).toHaveBeenCalledWith(
                { Guild: 'test-guild-123' },
                expect.any(Function)
            );
            
            expect(interaction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('successfully **disabled**'),
                flags: MessageFlags.Ephemeral
            });
        });
    });

    describe('permissions check', () => {
        it('should deny access without ManageGuild permission', async () => {
            interaction.options.getSubcommand.mockReturnValue('setup');
            interaction.member.permissions.has.mockReturnValue(false);
            
            await countingCommand.execute(interaction, client);
            
            expect(interaction.reply).toHaveBeenCalledWith({
                content: client.config.noPerms,
                flags: MessageFlags.Ephemeral
            });
            
            expect(require('../schemas/countingSystem').findOne).not.toHaveBeenCalled();
            expect(require('../schemas/countingSystem').create).not.toHaveBeenCalled();
            expect(require('../schemas/countingSystem').deleteMany).not.toHaveBeenCalled();
        });
    });
});
