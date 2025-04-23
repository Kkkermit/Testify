const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    usableInDms: true,
    category: "Owner",
    permissions: [PermissionFlagsBits.Administrator],
    data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluates JavaScript code.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {

        if (!client.config.developers.includes(interaction.user.id)) {

            await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, flags: MessageFlags.Ephemeral });
            
            const embed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.tag} has tried to run the eval command`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTitle(`Unauthorized Access Attempt Detected ${client.config.arrowEmoji}`)
            .setDescription(`${interaction.user.tag} has tried to run the eval command but is not a developer.\n\n If this persists, consider **revoking their access** to ${client.user.username} with \`\`/blacklist add\`\`.`)
            .addFields({ name: "UserID", value: `${interaction.user.id}`, inline: true })
            .setColor(client.config.embedDev)
            .setTimestamp()
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Eval warning embed ${client.config.devBy}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) });

            const developerIds = Array.isArray(client.config.developers) 
                ? client.config.developers 
                : [client.config.developers];

            for (const devId of developerIds) {
                try {
                    const dev = await client.users.fetch(devId.toString().trim());
                    await dev.send({ embeds: [embed] });
                } catch (err) {
                    client.logs.error(`[EVAL_ERROR] Failed to send eval warning embed to developer ${devId}: ${err}`);
                }
            }
            
            return;
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