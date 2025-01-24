const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const figlet = require('figlet')
const filter = require('../../jsons/filter.json');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('Converts text into ascii art.')
    .addStringOption(option => option.setName('text').setDescription('Specified text will be converted into art.').setRequired(true).setMaxLength(15)),
    async execute(interaction, client) {
        const text = interaction.options.getString('text')

        figlet(`${text}`, function (err, data) {

            if (err) {
                return interaction.reply({ content: `Something has gone wrong, please try again!`, ephemeral: true})
            }

            if (filter.words.includes(text)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

            const embed = new EmbedBuilder()
            .setColor(client.config.embedFun)
            .setTimestamp()
            .setDescription(`\`\`\`${data}\`\`\``)

            interaction.reply({ embeds: [embed] });
        
        });
    }
}