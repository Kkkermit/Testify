const { SlashCommandBuilder } = require('discord.js');
const { ApexChat } = require('apexify.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Generate AI chat response')
    .addStringOption(option => option.setName('prompt').setDescription('The prompt for gpt').setRequired(true)),
    async execute(interaction) {

    await interaction.deferReply()
    const modal = interaction.options.getString('modal');
    const prompt = interaction.options.getString('prompt');

    // Modals: v3-32k, turbo, apexChat, starChat, check docs //

        try {
            const response = await ApexChat("turbo", prompt);

            await interaction.editReply({ content: `${response}` });
        } catch (error) {
        console.error(error);
        await interaction.editReply({ content: `\`\`An error occurred while generating your response. Please try again later.\`\``, ephemeral: true });
        }
    },
};