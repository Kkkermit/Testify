const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('economy-delete')
    .setDescription('Delete an economy account.')
    .addSubcommand(command => command.setName('account').setDescription('Delete your economy account')),
    async execute(interaction, client) {

        const { options, user, guild } = interaction;

        const sub = options.getSubcommand();
        let data = await ecoS.findOne({ Guild: guild.id, User: user.id });

        switch (sub) {
            case "account":
                if (!data) { 
                    return await interaction.reply({ content: "You don't have an economy account to delete!", ephemeral: true });
                } else {
                    await ecoS.deleteOne({ Guild: guild.id, User: user.id });

                    const deleted = new EmbedBuilder()
                    .setAuthor({ name: `Economy System ${client.config.devBy}` })
                    .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
                    .setTimestamp()
                    .setColor(client.config.embedEconomy)
                    .setDescription('> Your economy account has been **deleted**.')

                    await interaction.reply({ embeds: [deleted] });
                }
                break;
        }
    }
}