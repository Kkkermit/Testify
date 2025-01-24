const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('latency')
    .setDescription('View the speed of the bot\'s response.'),
    async execute(interaction, client) {

        const embed = new EmbedBuilder()
        .setAuthor({ name: `Latency Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Latency Test ${client.config.arrowEmoji}`)
        .setDescription(`**\`🍯 LATENCY: ${interaction.client.ws.ping} ms\`**`)
        .setColor(client.config.embedCommunity)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})
        .setTimestamp()

        const btn = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setCustomId('btn')
            .setStyle(ButtonStyle.Primary)
            .setLabel('Refresh')
        )

        const msg = await interaction.reply({ embeds: [embed], components: [btn] })

        const collector = msg.createMessageComponentCollector()
        collector.on('collect', async i => {
            if(i.customId == 'btn') {
                i.update({ embeds: [
                    new EmbedBuilder()
                    .setAuthor({ name: `Latency Command ${client.config.devBy}`})
                    .setTitle(`${client.user.username} Latency Test ${client.config.arrowEmoji}`)
                    .setDescription(`**\`🍯 LATENCY: ${interaction.client.ws.ping} ms\`**`)
                    .setColor(client.config.embedCommunity)
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})
                    .setTimestamp()
                ], components: [btn] })
            }
        })
    }
}