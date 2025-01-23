const { Events, EmbedBuilder } = require('discord.js');
const { activeGames } = require('../../commands/Test/pokemon');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton() || interaction.customId !== 'pass_pokemon') return;

        const channelId = interaction.channelId;
        if (!activeGames.has(channelId)) return;

        const gameData = activeGames.get(channelId);
        if (!gameData.active) return;

        const passEmbed = new EmbedBuilder()
            .setTitle('Pokemon Passed!')
            .setDescription(`The Pokemon was ${gameData.pokemon}!`)
            .setImage(gameData.sprite)
            .setColor('Red');

        await interaction.update({
            embeds: [passEmbed],
            components: []
        });

        activeGames.delete(channelId);

        setTimeout(() => {
            if (!activeGames.has(channelId)) {
                const command = require('../../commands/Test/pokemon');
                command.startNewRound(channelId, interaction.channel);
            }
        }, 3000);
    }
};