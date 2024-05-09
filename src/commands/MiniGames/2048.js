const { SlashCommandBuilder } = require("discord.js");
const { TwoZeroFourEight } = require("discord-gamecord");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('2048')
    .setDescription(`Play a game of 2048.`),
    async execute(interaction, client) {
    
    const game = new TwoZeroFourEight({
        message: interaction,
        isSlashGame: true,
        embed: {
            title: "2048",
            color: client.config.embedMiniGames,
        },
        emojis: {
            up: "⬆️",
            down: "⬇️",
            left: "⬅️",
            right: "➡️",
        },
        timeoutTime: 60000,
        buttonStyle: "PRIMARY",
        timeoutMessage: '> The game went unfinished.',
        playerOnlyMessage: "Only **{player}** can use these buttons.",
    });

    try {
        await game.startGame();
      } catch (err) {
        console.log(err);
        await interaction.reply('\`\`\`There was an error starting the game!\`\`\`');
      }
  },
};