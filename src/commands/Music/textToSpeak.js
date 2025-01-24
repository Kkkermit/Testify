const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const filter = require('../../jsons/filter.json');

module.exports={
    data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Sends a text to speech message in the server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.SendTTSMessages)
    .addStringOption(option => option.setName('message').setDescription('The message you want to send').setRequired(true)),
    async execute(interaction, client){

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.SendTTSMessages)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true})

        const message = interaction.options.getString('message');

        if (filter.words.includes(message)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

        const embed = new EmbedBuilder()
        .setAuthor({ name: `TTS Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Text to Speech Tool ${client.config.arrowEmoji}`)
        .setDescription(`> ${message}`)
        .setColor(client.config.embedMusic)
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})
        .setTimestamp();

        await interaction.reply({ content: `${message}`, ephemeral: true, tts: true})
        await interaction.channel.send({ embeds: [embed] });
    }
}