const { SlashCommandBuilder } = require(`discord.js`);
const { Slots } = require('discord-gamecord');

module.exports = {
    data: new SlashCommandBuilder()
    .setName(`slots`)
    .setDescription(`Play a game of Slots!`),
    async execute (interaction, client) {

        const game = new Slots({
            message: interaction,
            isSlashGame: true,
            embed: {
                title: '> Slot Machine',
                color: client.config.embedMiniGames
            },
            slots: ['🍇', '🍊', '🍋', '🍌']
        });
        
        try {
            await game.startGame();
        } catch (err) {
            console.log(err);
            await interaction.reply('\`\`\`There was an error starting the game!\`\`\`');
        }

    },
};