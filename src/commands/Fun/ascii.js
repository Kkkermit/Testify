const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const figlet = require('figlet')
const filter = require('../../jsons/filter.json');

module.exports = {
    usableInDms: true,
    category: "Fun",
    data: new SlashCommandBuilder()
    .setName('ascii')
    .setDescription('Converts text into ascii art.')
    .addStringOption(option => option.setName('text').setDescription('Specified text will be converted into art.').setRequired(true).setMaxLength(15)),
    async execute(interaction, client) {
        const text = interaction.options.getString('text')

        figlet(`${text}`, function (err, data) {

            if (err) {
                return interaction.reply({ content: `Something has gone wrong, please try again!`, flags: MessageFlags.Ephemeral})
            }

            if (filter.words.includes(text)) return interaction.reply({ content: `${client.config.filterMessage}`, flags: MessageFlags.Ephemeral});

            const embed = new EmbedBuilder()
            .setColor(client.config.embedFun)
            .setTimestamp()
            .setDescription(`\`\`\`${data}\`\`\``)

            interaction.reply({ embeds: [embed] });
        
        });
    }
}