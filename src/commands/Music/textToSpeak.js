const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const filter = require('../../jsons/filter.json');

module.exports = {
    usableInDms: false,
    category: "Music",
    permissions: [PermissionFlagsBits.SendTTSMessages],
    data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Sends a text to speech message in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendTTSMessages)
    .addStringOption(option => option.setName('message').setDescription('The message you want to send').setRequired(true)),
    async execute(interaction, client){

        const message = interaction.options.getString('message');

        if (filter.words.includes(message)) return interaction.reply({ content: `${client.config.filterMessage}`, flags: MessageFlags.Ephemeral});

        const embed = new EmbedBuilder()
        .setAuthor({ name: `TTS Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Text to Speech Tool ${client.config.arrowEmoji}`)
        .setDescription(`> ${message}`)
        .setColor(client.config.embedMusic)
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})
        .setTimestamp();

        await interaction.reply({ content: `${message}`, flags: MessageFlags.Ephemeral, tts: true})
        await interaction.channel.send({ embeds: [embed] });
    }
}