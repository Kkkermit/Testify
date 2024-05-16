const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('bot-member-count')
    .setDescription('Shows the amount of members the bot watches over (OWNER ONLY COMMAND).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        
        if (interaction.user.id !== client.config.developers){
            return interaction.reply(`${client.config.ownerOnlyCommand}`).then(e => {
                setTimeout(() => e.delete(), 4000);
            });
        }
        const embed = new EmbedBuilder()
        .setAuthor({ name: `Member Count Command ${client.config.devBy}` })
        .setTitle(`${client.user.username} Member Count Tool ${client.config.arrowEmoji}`)
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: `${client.user.username}'s member count`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp()
        .setDescription(`\`\`\`fix\nMember Count:\n${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)}\`\`\``)
        .setColor(client.config.embedDev)

        await interaction.reply({ embeds: [embed], ephemeral: true});
    }
}