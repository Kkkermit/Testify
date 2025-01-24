const { Events, EmbedBuilder, version } = require('discord.js');
const botStats = require('../../schemas/fixedBotsStatsSystem');
const os = require('os');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: Events.ClientReady,
    async execute(interaction, client) {
        if (!client || !client.guilds) {
            console.error(`${color.red}[${getTimestamp()}] [BOT_STATS] Client or client.guilds is not defined`);
            return;
        }

        const editMessage = async () => {
            const channelAddData = await botStats.find();

            if (!channelAddData) return;

            channelAddData.forEach(async data => {
                try {
                    const guild = client.guilds.cache.get(data.Guild);
                        if (!guild) {
                            console.error(`${color.red}[${getTimestamp()}] [BOT_STATS] Guild not found: ${data.Guild}`);
                            return;
                        }
                        const channel = guild.channels.cache.get(data.Channel);
                        if (!channel) {
                            console.error(`${color.red}[${getTimestamp()}] [BOT_STATS] Channel not found: ${data.Channel}`);
                            return;
                        }
                        const message = await channel.messages.fetch(data.MessageId);
                        if (!message) {
                            console.error(`${color.red}[${getTimestamp()}] [BOT_STATS] Message not found: ${data.MessageId}`);
                            return;
                        }

                    const cpus = os.cpus();
                    const cpuModel = cpus[0].model;
                    const cpuUsage = (process.cpuUsage().user / 1024 / 1024).toFixed(2);
                    const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

                    const embed = new EmbedBuilder()
                    .setAuthor({ name: `Bot stats ${client.config.devBy}`})
                    .setColor(client.config.embedInfo)
                    .setTitle(`${client.user.username} Bot statistics ${client.config.arrowEmoji}`)
                    .setDescription(`**Global Statistics**\nGuild Count - \`\`${client.guilds.cache.size}\`\`\nGlobal Users - \`\`${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)}\`\`\nTotal Commands - \`\`${client.commands.size + client.pcommands.size}\`\`\n\n**System Statistics**\nCPU - \`\`${cpuModel}\`\`\nCPU Usage - \`\`${cpuUsage}%\`\`\nRAM Usage - \`\`${ramUsage}MB\`\`\nNode.js Version - \`\`${process.version}\`\`\nDiscord.js Version - \`\`${version}\`\``)
                    .setFooter({ text: `${client.user.username} - Bot statistics - Last Updated` })
                    .setTimestamp(message.editedTimestamp || message.createdTimestamp)
                    .setThumbnail(client.user.avatarURL());

                    await message.edit({ embeds: [embed] });
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}] [BOT_STATS] Error processing data for guild ${data.Guild}: \n${color.red}[${getTimestamp()}] [BOT_STATS]`,  error);
                }
            })
        }
        setInterval(editMessage, 300000);
        editMessage();
    }
}
