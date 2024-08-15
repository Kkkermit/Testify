const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluates JavaScript code.'),
    async execute(interaction, client) {

        if (interaction.user.id !== client.config.developers) {
            return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, ephemeral: true,});
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