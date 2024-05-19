const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Schema = require("../../schemas/auditLoggingSystem");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("auditlog-delete")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDescription("Delete the audit log system in your server"),
    async execute(interaction, client) {

        const { guild } = interaction;

        const data = await Schema.findOne({
            Guild: guild.id,
        });

        if (!data) {
            return await interaction.reply({ content: "You **don't** have an audit log system set up in this server!", ephemeral: true });
        }

        await Schema.deleteMany({
            Guild: guild.id,
        });

        const embed = new EmbedBuilder()
        .setAuthor({ name: `Audit Log Remove ${client.config.devBy}`, iconURL: guild.iconURL() })
        .setTitle(`${client.config.auditLogEmoji} Audit Log Deleted`)
        .setDescription(`The audit log system has been **successfully** deleted from **${guild.name}**. To set it up again, use the setup command!`)
        .setColor(client.config.embedAuditLogs)
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `${client.user.username}'s logging system removed` })
        .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};