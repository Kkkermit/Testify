const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('iq')
    .setDescription("Generates and provides the user's IQ")
    .addUserOption(option => option.setName('user').setDescription('The user you want to check the IQ of').setRequired(false)),
    async execute(interaction, client) {

        const user = interaction.options.getUser('user') || interaction.user;

        const minIQ = 2;
        const maxIQ = 200;
        const randomIQ = Math.floor(Math.random() * (maxIQ - minIQ + 1)) + minIQ;
        let message = `${user}'s IQ is ${randomIQ}.`;

        if (randomIQ >= 80) {
            message = `> ${user}'s IQ is high **${randomIQ}** You're a genius! 🧠`;
        } else if (randomIQ <= 50) {
            message = `> ${user}'s IQ is low **${randomIQ}** Keep learning and growing! 📚`;
        }

        const embed = new EmbedBuilder()
        .setAuthor({ name: `IQ Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} IQ Tool ${client.config.arrowEmoji}`)
        .setDescription(`Checking IQ for ${user}`)
        .setColor(client.config.embedFun)
        .addFields({name: '• IQ level', value: (message)})
        .setTimestamp()
        .setFooter({text: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))

        await interaction.reply({ embeds: [embed] });
    },
};