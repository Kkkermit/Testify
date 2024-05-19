const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require("discord.js");
const levelSchema = require(`../../schemas/userLevelSystem`);

module.exports = {
    data: new SlashCommandBuilder()
    .setName(`xp-reset`)
    .setDescription(`Resets ALL of the servers xp`)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {

        if(!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true });

        const { guildId } = interaction;

        levelSchema.deleteMany({ Guild: guildId }, async (err, data) => {

            const embed = new EmbedBuilder()
            .setColor(client.config.embedLevels)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `Leveling System Reset ${client.config.devBy}`})
            .setFooter({ text: `Leveling System XP Reset`})
            .setTimestamp()
            .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
            .addFields({ name: `Level data wiped`, value: `All the level data has been wiped from the server. Users XP has been reset to \`\`0\`\`.`})
            
            await interaction.reply({ embeds: [embed] })
        })

    }
}