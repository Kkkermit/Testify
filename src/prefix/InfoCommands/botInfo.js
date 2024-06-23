const { EmbedBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const guildSettingsSchema = require('../../schemas/prefixSystem.js');

module.exports = {
    name: "bot-info",
    aliases: ["bi", "botinfo"],
    async execute(message, client) {

        let serverCount = await client.guilds.cache.reduce((a,b) => a+b.memberCount, 0);

        let totalSeconds = (client.uptime / 1000);
        let days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        let uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: message.guild.id });
        const guildPrefix = fetchGuildPrefix.Prefix;

        const embed = new EmbedBuilder()
        .setColor(client.config.embedDev)
        .setTitle(`__${client.user.username} Bot Information__ ${client.config.arrowEmoji}`)
        .setAuthor({ name: `Bot Information ${client.config.devBy}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Most up-to-date information about ${client.user.username}`})
        .setTimestamp()
        .addFields({ name: 'Developer', value: `> \`${client.config.dev}\`` })
        .addFields({ name: 'Servers Count', value: `> \`${client.guilds.cache.size}\`` })
        .addFields({ name: 'Members Count', value: `> \`${serverCount}\`` })
        .addFields({ name: 'Prefix', value: `> \`${guildPrefix}\``})
        .addFields({ name: 'Commands', value: `> \`${client.pcommands.size}\`` })
        .addFields({ name: 'Aliases', value: `> \`${client.aliases.size}\`` })
        .addFields({ name: 'Slash Commands', value: `> \`${client.commands.size}\``})
        .addFields({ name: 'Latency', value: `> \`${Math.round(client.ws.ping)}ms\`` })
        .addFields({ name: 'Uptime', value: `> \`\`\`${uptime}\`\`\`` })
        

        const refresh = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Primary)
        )

        const sentMessage = await message.reply({ embeds: [embed], components: [refresh] })

        const collector = sentMessage.createMessageComponentCollector()
        collector.on('collect', async message => {
            if (message.customId == 'refresh') {
                try {

                    let serverCount = await client.guilds.cache.reduce((a,b) => a+b.memberCount, 0);

                    let totalSeconds = (client.uptime / 1000);
                    let days = Math.floor(totalSeconds / 86400);
                    totalSeconds %= 86400;
                    let hours = Math.floor(totalSeconds / 3600);
                    totalSeconds %= 3600;
                    let minutes = Math.floor(totalSeconds / 60);
                    let seconds = Math.floor(totalSeconds % 60);

                    let uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

                    const refreshEmbed = new EmbedBuilder()
                    .setColor(client.config.embedDev)
                    .setTitle(`__${client.user.username} Bot Information__ ${client.config.arrowEmoji}`)
                    .setAuthor({ name: `Bot Information ${client.config.devBy}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: `Most up-to-date information about ${client.user.username}`})
                    .setTimestamp()
                    .addFields({ name: 'Developer', value: `> \`${client.config.dev}\`` })
                    .addFields({ name: 'Servers Count', value: `> \`${client.guilds.cache.size}\`` })
                    .addFields({ name: 'Members Count', value: `> \`${serverCount}\`` })
                    .addFields({ name: 'Prefix', value: `> \`${guildPrefix}\``})
                    .addFields({ name: 'Commands', value: `> \`${client.pcommands.size}\`` })
                    .addFields({ name: 'Aliases', value: `> \`${client.aliases.size}\`` })
                    .addFields({ name: 'Slash Commands', value: `> \`${client.commands.size}\``})
                    .addFields({ name: 'Latency', value: `> \`${Math.round(client.ws.ping)}ms\`` })
                    .addFields({ name: 'Uptime', value: `> \`\`\`${uptime}\`\`\`` })

                    await message.update({ embeds: [refreshEmbed], components: [refresh] })
                } catch (error) {
                    client.logs.error(`[BOT_INFO] Error generating refresh.`, error)
                }
            }
        })
    }
}