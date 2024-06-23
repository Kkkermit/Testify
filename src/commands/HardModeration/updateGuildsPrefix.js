const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const prefixSchema = require('../../schemas/prefixSystem.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('change-prefix')
    .setDescription('Change the prefix of the bot in your server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option.setName('prefix').setDescription('The new prefix you want to set.').setRequired(true)),
    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        const prefix = interaction.options.getString('prefix');
        if (prefix.length > 4) return interaction.reply({ content: 'The prefix **cannot** be longer than 4 characters!', ephemeral: true });

        const data = await prefixSchema.findOne({ Guild: interaction.guild.id });
        if (!data) {
            await new prefixSchema({
                Guild: interaction.guild.id,
                Prefix: prefix
            }).save();
        } else {
            await prefixSchema.findOneAndUpdate({
                Guild: interaction.guild.id,
                Prefix: prefix
            });
        }

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Prefix update command ${client.config.devBy}`})
        .setTitle(`${client.user.username} prefix update ${client.config.arrowEmoji}`)
        .setDescription(`The prefix has been changed to **\`${prefix}\`**`)
        .setTimestamp()
        .setFooter({ text: `Prefix updated by ${interaction.user.username}`});

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}