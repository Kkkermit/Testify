const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the specified channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option => option.setName('channel').setDescription('The channel you want to unlock').addChannelTypes(ChannelType.GuildText).setRequired(true)),
    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        let channel = interaction.options.getChannel('channel');

        channel.permissionOverwrites.create(interaction.guild.id, {SendMessages: true})

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Unlock Command ${client.config.devBy}`})
        .setTimestamp()
        .setTitle(`${client.config.modEmojiHard} ${client.user.username} has unlocked a channel ${client.config.arrowEmoji}`)
        .setDescription(`> **Channel:** ${channel} has been unlocked by **${interaction.user.username}**!`)
        .setFooter({ text: `Channel Unlocked`})

        await interaction.reply({ content: `Message sent to channel`, ephemeral: true });
        await channel.send({ embeds: [embed] });
    }
}