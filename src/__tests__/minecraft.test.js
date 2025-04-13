const minecraftCommand = require('../commands/Community/minecraftInfo');
const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');

describe('minecraft command', () => {
    let interaction;
    let client;
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = jest.fn();

        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;

        interaction.deferReply = jest.fn();
        interaction.editReply = jest.fn();
        interaction.options.getSubcommand = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
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
                author: { name: 'MineCraft Skin Command DevName' },
                title: 'TestBot Minecraft Skin Tracker ➡️',
                description: `> **${username}'s** Minecraft Skin:`,
                color: 65280,
                image: { url: `https://minotar.net/body/${username}/100.png` }
            });

            expect(embed.data.timestamp).toBeDefined();
            expect(embed.data.footer.text).toContain('Requested by');
        });
    });

    describe('server subcommand', () => {
        it('should fetch and display server information', async () => {
            const serverIp = 'hypixel.net';
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue(serverIp);

            const mockServerData = {
                hostname: 'hypixel.net',
                ip: '172.65.230.166',
                port: 25565,
                version: '1.8.9-1.19.4',
                players: { online: 85000, max: 200000 },
                motd: { clean: 'Welcome to Hypixel!' }
            };

            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockServerData)
            };
            global.fetch.mockResolvedValue(mockResponse);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();

            expect(global.fetch).toHaveBeenCalledWith(`https://api.mcsrvstat.us/1/${serverIp}`);

            expect(interaction.editReply).toHaveBeenCalled();
            const replyCall = interaction.editReply.mock.calls[0][0];
            expect(replyCall.embeds).toBeDefined();
            expect(replyCall.embeds.length).toBe(1);

            const embed = replyCall.embeds[0];
            expect(embed.data).toMatchObject({
                author: { name: 'MineCraft Server Command DevName' },
                title: 'TestBot Minecraft Server Tool ➡️',
                color: 65280,
                footer: { text: 'Server Status Displayed' }
            });

            const fields = embed.data.fields;
            expect(fields).toContainEqual({ name: 'Server', value: '> hypixel.net' });
            expect(fields).toContainEqual({ name: 'IP Address', value: '> 172.65.230.166', inline: true });
            expect(fields).toContainEqual({ name: 'Port', value: '> 25565', inline: true });
            expect(fields).toContainEqual({ name: 'Version', value: '> 1.8.9-1.19.4' });
            expect(fields).toContainEqual({ name: 'MOTD', value: '> Welcome to Hypixel!' });
            expect(fields).toContainEqual({ name: 'Online Players', value: '> 85000', inline: true });
            expect(fields).toContainEqual({ name: 'Max Players', value: '> 200000', inline: true });

            expect(embed.data.timestamp).toBeDefined();
        });

        it('should handle errors when fetching server information', async () => {
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue('invalid-server.net');

            global.fetch.mockRejectedValue(new Error('Failed to fetch server data'));

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();

            expect(global.fetch).toHaveBeenCalledWith('https://api.mcsrvstat.us/1/invalid-server.net');

            expect(interaction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('Server **does not exist**'),
                flags: MessageFlags.Ephemeral
            });
        });

        it('should handle servers with missing or invalid data', async () => {
            interaction.options.getSubcommand.mockReturnValue('server');
            interaction.options.getString.mockReturnValue('offline-server.net');

            const mockServerData = {
                ip: '127.0.0.1',
                port: 25565,
                version: 'Unknown',
            };

            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockServerData)
            };
            global.fetch.mockResolvedValue(mockResponse);

            await minecraftCommand.execute(interaction, client);

            expect(interaction.deferReply).toHaveBeenCalled();

            expect(interaction.editReply).toHaveBeenCalledWith({
                content: expect.stringContaining('Server **does not exist**'),
                flags: MessageFlags.Ephemeral
            });
        });
    });
});
