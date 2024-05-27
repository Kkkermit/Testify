const { SlashCommandBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const countingSchema = require('../../schemas/countingSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('counting')
    .setDescription(`Manages the counting system in your server.`)
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(command => command.setName('setup').setDescription(`Sets up the counting system for your server.`).addChannelOption(option => option.setName('channel').setDescription(`Please indicate the channel where you would like the counting messages to be sent.`).setRequired(true).addChannelTypes(ChannelType.GuildText)).addIntegerOption(option => option.setName('max-count').setDescription(`The maximum number you want the server members to count up to (default 1000)`).setRequired(false).setMinValue(1)))
    .addSubcommand(command => command.setName('disable').setDescription(`Disables the counting system in your server.`)),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        if(!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return await interaction.reply({content: `${client.config.noPerms}`, ephemeral: true })

        switch(sub) {
            case 'setup':

            const channel = interaction.options.getChannel('channel');
            const maxCount = interaction.options.getInteger('max-count') || 1000;

            countingSchema.findOne({ Guild: interaction.guild.id }, async (err, data) => {
                if (data) {
                    return await interaction.reply({ content: 'You already have a counting system in place. To restart it, use the \`/counting-disable\` command.', ephemeral: true });
                }

                countingSchema.create({
                    Guild: interaction.guild.id,
                    Channel: channel.id,
                    Count: 0,
                    MaxCount: maxCount
                });

                const setupEmbed = new EmbedBuilder()
                .setColor(client.config.embedFun)
                .setAuthor({ name: `Counting System Setup ${client.config.devBy}`})
                .setTitle(`${client.user.username} Counting System ${client.config.arrowEmoji}`)
                .setDescription(`> The counting system has been **successfully** implemented within ${channel}. \n> The maximum count is set to ${maxCount}.`)
                .setFooter({ text: `Counting System Setup`})
                .setTimestamp();

                await interaction.reply({ embeds: [setupEmbed] });

                const countingEmbed = new EmbedBuilder()
                .setColor(client.config.embedFun)
                .setAuthor({ name: `Counting System Setup ${client.config.devBy}`})
                .setTitle(`${client.user.username} Counting System ${client.config.arrowEmoji}`)
                .setDescription(`> The counting system has been **enabled** in this channel. \n> To begin using this, type \`1\` to start the count. \n> The maximum count is set to \`${maxCount}\`.`)

                await channel.send({ embeds: [countingEmbed] });
            });

            break;
            case 'disable':

            countingSchema.deleteMany({ Guild: interaction.guild.id }, async (err, data) => {
                await interaction.reply({ content: 'The Counting System has been successfully **disabled**!', ephemeral: true });
            });
        }
    }
}