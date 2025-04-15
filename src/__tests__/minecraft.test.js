const minecraftCommand = require('../commands/Community/minecraftInfo');
const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');

describe('minecraft command', () => {
    let interaction;
    let client;
    let originalFetch;
    let originalConsoleError;

    beforeEach(() => {
        originalFetch = global.fetch;
        originalConsoleError = console.error;
        
        console.error = jest.fn();
        global.fetch = jest.fn();

        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;

        interaction.deferReply = jest.fn().mockResolvedValue();
        interaction.editReply = jest.fn().mockResolvedValue();
        interaction.reply = jest.fn().mockResolvedValue();
        interaction.options.getSubcommand = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        console.error = originalConsoleError;
        teardownTest();
        jest.clearAllMocks();
    });

    describe('skin subcommand', () => {
        it('should display a Minecraft skin embed for a given username', async () => {
            const username = 'Notch';
            interaction.options.getSubcommand.mockReturnValue('skin');
            interaction.options.getString.mockReturnValue(username);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.reply).toHaveBeenCalled();
            const replyCall = interaction.reply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
            expect(replyCall.embeds.length).toBe(1);

            const embed = replyCall.embeds[0];
            expect(embed.data).toMatchObject({
                author: { 
                    name: '🎮 Minecraft Skin Finder DevName' 
                },
                title: `👤 ${username}'s Minecraft Skin`,
                description: expect.stringContaining(`🔍 Showing skin info for **${username}**`),
                color: 65280,
                image: { url: `https://minotar.net/armor/body/${username}/300.png` }
            });

            expect(embed.data.timestamp).toBeDefined();
            expect(embed.data.footer.text).toContain('Requested by');
            
            expect(embed.data.fields).toHaveLength(2);
            expect(embed.data.fields[0].name).toBe('📝 Download Options');
            expect(embed.data.fields[1].name).toBe('🔗 Related Links');
        });
    });

    describe('server subcommand', () => {
        it('should fetch and display server information for online server with refresh button', async () => {
            const serverIp = 'hypixel.net';
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue(serverIp);

            const mockServerData = {
                online: true,
                hostname: 'hypixel.net',
                ip: '172.65.230.166',
                port: 25565,
                version: '1.8.9-1.19.4',
                players: { online: 85000, max: 200000 },
                motd: { clean: ['Welcome to Hypixel!'] }
            };

            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockServerData)
            };
            global.fetch.mockResolvedValue(mockResponse);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith(`https://api.mcsrvstat.us/2/${serverIp}`);
            expect(interaction.editReply).toHaveBeenCalled();
            
            const replyCall = interaction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
            expect(replyCall.embeds.length).toBe(1);
            expect(replyCall.components).toBeDefined();
            expect(replyCall.components.length).toBe(1);

            const embed = replyCall.embeds[0];
            expect(embed.data).toMatchObject({
                author: { name: '🎮 Minecraft Server Info DevName' },
                title: '🖥️ hypixel.net Server Status',
                description: expect.stringContaining('🟢 **Server is online!**'),
                color: 65280,
            });

            const playerField = embed.data.fields.find(f => f.name.includes('Players'));
            expect(playerField).toBeDefined();
            expect(playerField.value).toContain('🟩');

            const joinField = embed.data.fields.find(f => f.name === '🎮 How to Join');
            expect(joinField).toBeDefined();
            expect(joinField.value).toContain('hypixel.net');

            const buttonComponent = replyCall.components[0];
            expect(buttonComponent).toBeDefined();
            
            const buttonData = buttonComponent.toJSON();
            expect(buttonData.components).toHaveLength(1);
            
            const refreshButton = buttonData.components[0];
            expect(refreshButton.custom_id).toBe(`minecraft-refresh_${serverIp}`);
            expect(refreshButton.label).toBe('🔄 Refresh Server Info');
            expect(refreshButton.style).toBe(1);
        });

        it('should handle offline servers', async () => {
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue('offline-server.net');

            const mockServerData = {
                online: false,
                ip: '127.0.0.1',
                port: 25565
            };

            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockServerData)
            };
            global.fetch.mockResolvedValue(mockResponse);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();
            expect(interaction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('❌ The server'),
                flags: MessageFlags.Ephemeral
            });
        });

        it('should handle fetch errors when connecting to server', async () => {
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue('invalid-server.net');

            const expectedError = new Error('Failed to fetch server data');
            global.fetch.mockRejectedValue(expectedError);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();
            expect(console.error).toHaveBeenCalledWith('Minecraft server info error:', expectedError);
            expect(interaction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('❌ Failed to fetch server information'),
                flags: MessageFlags.Ephemeral
            });
        });

        it('should handle servers with missing data', async () => {
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue('partial-data-server.net');

            const mockServerData = {
                online: true,
                ip: '127.0.0.1',
            };

            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockServerData)
            };
            global.fetch.mockResolvedValue(mockResponse);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();
            
            expect(interaction.editReply).toHaveBeenCalled();
            const replyCall = interaction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
            expect(replyCall.components).toBeDefined();
            
            const embed = replyCall.embeds[0];
            
            const buttonComponent = replyCall.components[0];
            expect(buttonComponent).toBeDefined();
            
            const buttonData = buttonComponent.toJSON();
            expect(buttonData.components).toHaveLength(1);
            
            const refreshButton = buttonData.components[0];
            expect(refreshButton.custom_id).toBe(`minecraft-refresh_partial-data-server.net`);
            
            const playerField = embed.data.fields.find(f => f.name.includes('Players'));
            expect(playerField).toBeDefined();
            expect(playerField.value).toContain('⬜');
        });
    });

    it('should handle invalid subcommands', async () => {
        interaction.options.getSubcommand.mockReturnValue('invalid');
        
        await minecraftCommand.execute(interaction, client);
        
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '❓ Invalid subcommand. Please use `/minecraft skin <username>` or `/minecraft server <ip>`.', 
            ephemeral: true
        });
    });
});
