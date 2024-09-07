const { Events, EmbedBuilder } = require('discord.js');
const guildSettingsSchema = require('../../schemas/prefixSystem');  

module.exports = {
    name: Events.MessageCreate,
    async execute (message, client) {

        const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: message.guild.id });
        const guildPrefix = fetchGuildPrefix ? fetchGuildPrefix.Prefix : null;
        if (!message.author.bot && message.content.startsWith(guildPrefix)) {

            const channel = await client.channels.cache.get(client.config.prefixCommandLoggingChannel);
            const server = message.guild.name;
            const user = message.author.username;
            const userID = message.author.id;

            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({ name: `${user} has used a command.`, iconURL: client.user.avatarURL({ dynamic: true }) })
            .setTitle(`${client.user.username} Command Logger ${client.config.arrowEmoji}`)
            .addFields({ name: 'Server Name', value: `${server}` })
            .addFields({ name: 'Command', value: `\`\`\`${message.content}\`\`\`` })
            .addFields({ name: 'User', value: `${user} | ${userID}` })
            .setTimestamp()
            .setFooter({ text: `Command Logger ${client.config.devBy}`, iconURL: message.author.avatarURL({ dynamic: true }) })

            await channel.send({ embeds: [embed] });
        }
    }
}
