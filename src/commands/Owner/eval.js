const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluates JavaScript code.'),
    async execute(interaction, client) {

        if (!client.config.developers.includes(interaction.user.id)) {
            const embed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.tag} has tried to run the eval command`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`Unauthorized Access Attempt Detected. ${interaction.user.tag} has tried to run the eval command but is not a developer.`)
            .setDescription(`If this persists, consider **revoking their access** to ${client.user.username} with \`\`/blacklist add\`\`.`)
            .addFields({ name: "UserID", value: `${interaction.user.id}`, inline: true })
            .setColor(client.config.embedDev)
            .setTimestamp()
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `${client.config.devBy}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });

            for (const developerId of client.config.developers) {
                try {
                    const developer = await client.users.fetch(developerId);
                    await developer.send({ embeds: [embed] });
                } catch (error) {
                    client.logs.error(`[EVAL_ERROR] Failed to send message to developer ${developerId}:`, error);
                }
            }
            
            return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, flags: MessageFlags.Ephemeral,});
        }

        const modal = new ModalBuilder()
            .setCustomId('evalModal')
            .setTitle('Evaluate JavaScript Code');

        const codeInput = new TextInputBuilder()
            .setCustomId('codeInput')
            .setLabel('Code to evaluate')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const ephemeralInput = new TextInputBuilder()
            .setCustomId('ephemeralInput')
            .setLabel('Ephemeral (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(codeInput);
        const secondActionRow = new ActionRowBuilder().addComponents(ephemeralInput);
        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    },
};