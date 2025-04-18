const { SlashCommandBuilder, EmbedBuilder, WebhookClient, MessageFlags } = require("discord.js");

module.exports = {
    usableInDms: false,
    category: "Developer",
    data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Suggest for a feature the bot should have")
    .addStringOption(option => option.setName("suggestion").setDescription("The suggestion").setRequired(true)),
    async execute (interaction, client) {

        const suggestion = interaction.options.getString("suggestion");
        
        const user = interaction.user.id;
        const guild = interaction.guild;

        const suggestionEmbed = new EmbedBuilder()
        .setAuthor({ name: `Suggestion Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Suggestion Tool ${client.config.arrowEmoji}`)
        .setColor(client.config.embedDev)
        .addFields({ name:"User: ", value:`<@${user}>`, inline: false})
        .setDescription(`New suggestion from ${interaction.user.username}: \n> **${suggestion}**`)
        .setFooter({ text: `Suggestion sent from ${guild.name}`, iconURL: guild.iconURL({ size: 1024 })})
        .setTimestamp()

        const channelEmbed = new EmbedBuilder()
        .setAuthor({ name: `Suggestion Command ${client.config.devBy}`})
        .setTitle(`You've sent a suggestion to the developers of ${client.user.username}!`)
        .setDescription(`Thank you for the suggestion of: \n> **${suggestion}**`)
        .setColor(client.config.embedColor)
        .setTimestamp()

        const userEmbed = new EmbedBuilder()
        .setAuthor({ name: `Suggestion Command ${client.config.devBy}`})
        .setTitle(`You've sent a suggestion to the developers of ${client.user.username}!`)
        .setThumbnail(client.user.avatarURL())
        .setDescription(`Thank you for the suggestion of: \n> **${suggestion}**`)
        .setColor(client.config.embedColor)
        .setFooter({ text: `Suggestion sent from ${guild.name}`, iconURL: guild.iconURL({ size: 1024 })})
        .setTimestamp()

        try {
            const webhookURL = process.env.webhookSuggestionLogging;
            if (!webhookURL) {
                client.logs.error('[COMMAND_SUGGESTION_LOGGING_WEBHOOK] No webhook URL provided. Please provide a valid webhook URL in the .env file.');
                return;
            }

            const webhookClient = new WebhookClient({ url: webhookURL });

            await webhookClient.send({
                embeds: [suggestionEmbed],
                username: `${client.user.username} Suggestion Logger`,
                avatarURL: client.user.avatarURL(),
            });
        } catch (error) {
            client.logs.error('[COMMAND_SUGGESTION_LOGGING_WEBHOOK] Error whilst sending webhook:', error);
        }

        interaction.user.send({ embeds: [userEmbed]}).catch(err => {
            return;
        });

        return interaction.reply({ embeds: [channelEmbed], flags: MessageFlags.Ephemeral}).catch(err => {
            return;
        });
    }
}
