const { SlashCommandBuilder,EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('pp-size')
    .setDescription('Shows the size of your pp.'),
    async execute(interaction, client) {

        const penisSize = Math.floor(Math.random() * 10) + 1;
        let penisMain = '8';
        for (let i = 0; i < penisSize; i++) {
            penisMain += '=';
        }

        
        const penisEmbed = new EmbedBuilder()
        .setColor(client.config.embedFun)
        .setTitle(`> PP Size Machine`)
        .setThumbnail(client.user.avatarURL())
        .setAuthor({ name: `🍆 PP Size Machine`})
        .setFooter({ text: `🍆 PP Size`})
        .setDescription(`> Your pp size is: **${penisMain}D**`)
        .setTimestamp()

        await interaction.reply({ embeds: [penisEmbed] });
    },
};
