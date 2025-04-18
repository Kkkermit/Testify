const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, WebhookClient, MessageFlags } = require("discord.js");

module.exports = {
    usableInDms: false,
    category: "Developer",
    data: new SlashCommandBuilder()
    .setName("bug-report")
    .setDescription("Report a bug in the bot"),
    async execute (interaction, client) {
        
        const user = interaction.user.id;
        const guild = interaction.guild;

        let modal = new ModalBuilder()
            .setCustomId('report')
            .setTitle('Report a bug')

        let textInput = new TextInputBuilder()
            .setCustomId('report')
            .setPlaceholder('Type your issue here')
            .setLabel('Bug Report | Issue')
            .setMaxLength(250)
            .setMinLength(5)
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)

        let report = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(report)
        await interaction.showModal(modal)

        try {
            let response = await interaction.awaitModalSubmit({ time: 600000 })
            let message = response.fields.getTextInputValue('report')

            const bugEmbed = new EmbedBuilder()
                .setAuthor({ name: `Bug Report Command ${client.config.devBy}`})
                .setTitle(`${client.user.username} Bug Report Tool ${client.config.arrowEmoji}`)
                .setColor(client.config.embedDev)
                .addFields({ name:"User: ", value:`<@${user}>`, inline: false})
                .setDescription(`New bug report from ${interaction.user.username}: \n> **${message}**`)
                .setFooter({ text: `Bug report sent from ${guild.name}`, iconURL: guild.iconURL({ size: 1024 })})
                .setTimestamp()

            const channelEmbed = new EmbedBuilder()
                .setAuthor({ name: `Bug Report Command ${client.config.devBy}`})
                .setTitle(`You've sent a bug report to the developers of ${client.user.username}!`)
                .setDescription(`Thank you for the bug report of: \n> **${message}**`)
                .setColor(client.config.embedColor)
                .setTimestamp()

            const userEmbed = new EmbedBuilder()
                .setAuthor({ name: `Bug Report Command ${client.config.devBy}`})
                .setTitle(`You've sent a bug report to the developers of ${client.user.username}!`)
                .setThumbnail(client.user.avatarURL())
                .setDescription(`Thank you for the bug report of: \n> **${message}**`)
                .setColor(client.config.embedColor)
                .setFooter({ text: `Bug report sent from ${guild.name}`, iconURL: guild.iconURL({ size: 1024 })})
                .setTimestamp()

            try {
                const webhookURL = process.env.webhookBugLogging;
                if (!webhookURL) {
                    client.logs.error('[COMMAND_BUG_REPORT_LOGGING_WEBHOOK] No webhook URL provided. Please provide a valid webhook URL in the .env file.');
                    return;
                };

                const webhookClient = new WebhookClient({ url: webhookURL });

                await webhookClient.send({
                    embeds: [bugEmbed],
                    username: `${client.user.username} Bug Report Logger`,
                    avatarURL: client.user.avatarURL(),
                });
            } catch (error) {
                client.logs.error('[COMMAND_BUG_REPORT_LOGGING_WEBHOOK] Error whilst sending webhook:', error);
            }

            interaction.user.send({ embeds: [userEmbed]}).catch(err => {
                return;
            });

            await response.reply({ embeds: [channelEmbed], flags: MessageFlags.Ephemeral}).catch(err => {
                return;
            });
        } catch (error) {
            client.logs.error(error)
            return;
        }
    }
}
