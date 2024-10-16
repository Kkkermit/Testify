const { Events, EmbedBuilder, WebhookClient } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute (interaction, client) {

        if (!interaction) return;
        if (!interaction.isChatInputCommand()) return;
        else {

            const webhookURL = process.env.webhookSlashLogging;
            if (!webhookURL) {
                client.logs.error('[COMMAND_SLASH_LOGGING_WEBHOOK] No webhook URL provided. Please provide a valid webhook URL in the .env file.');
                return;
            };

            const server = interaction.guild.name;
            const user = interaction.user.username;
            const userID = interaction.user.id;

            const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({ name: `${user} has used a command.`, iconURL: client.user.avatarURL({ dynamic: true })})
            .setTitle(`${client.user.username} Command Logger ${client.config.arrowEmoji}`)
            .addFields({ name: 'Server Name', value: `${server}`})
            .addFields({ name: 'Command', value: `\`\`\`${interaction}\`\`\``})
            .addFields({ name: 'User', value: `${user} | ${userID}`})
            .setTimestamp()
            .setFooter({ text: `Command Logger ${client.config.devBy}`, iconURL: interaction.user.avatarURL({ dynamic: true })})

            try {
                const webhookClient = new WebhookClient({ url: webhookURL });

                await webhookClient.send({
                    embeds: [embed],
                    username: `${client.user.username} SlashCommand Logger`,
                    avatarURL: client.user.avatarURL(),
                });
            } catch (error) {
                client.logs.error('[COMMAND_SLASH_LOGGING_WEBHOOK] Error whilst sending webhook:', error);
            }
        }
    }
}