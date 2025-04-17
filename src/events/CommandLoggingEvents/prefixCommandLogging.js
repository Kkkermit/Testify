const { Events, EmbedBuilder, WebhookClient } = require('discord.js');  
const { getMessagePrefix } = require('../../utils/getMessagePrefix.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        
        const prefix = await getMessagePrefix(message, client);
        
        if (message.content.startsWith(prefix)) {
            const webhookURL = process.env.webhookPrefixLogging;
            if (!webhookURL) {
                client.logs.error('[COMMAND_PREFIX_LOGGING_WEBHOOK] No webhook URL provided. Please provide a valid webhook URL in the .env file.');
                return;
            };

            const user = message.author.username;
            const userID = message.author.id;
            
            const isInGuild = message.guild !== null;
            const location = isInGuild ? `Server: ${message.guild.name}` : "Direct Messages";

            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({ name: `${user} has used a command.`, iconURL: client.user.avatarURL({ dynamic: true }) })
            .setTitle(`${client.user.username} Command Logger ${client.config.arrowEmoji}`)
            .addFields({ name: 'Location', value: location })
            .addFields({ name: 'Command', value: `\`\`\`${message.content}\`\`\`` })
            .addFields({ name: 'User', value: `${user} | ${userID}` })
            .setTimestamp()
            .setFooter({ text: `Command Logger ${client.config.devBy}`, iconURL: message.author.avatarURL({ dynamic: true }) })

            try {
                const webhookClient = new WebhookClient({ url: webhookURL });

                await webhookClient.send({
                    embeds: [embed],
                    username: `${client.user.username} Prefix Command Logger`,
                    avatarURL: client.user.avatarURL(),
                });
            } catch (error) {
                client.logs.error('[COMMAND_PREFIX_LOGGING_WEBHOOK] Error whilst sending webhook:', error);
            }
        }
    }
}
