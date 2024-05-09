const { SlashCommandBuilder } = require("discord.js");
const { Connect4 } = require("discord-gamecord");

    module.exports = {
        data: new SlashCommandBuilder()
        .setName('connect-four')
        .setDescription('Play a game of Connect Four!')
        .addUserOption(option => option.setName('opponent').setDescription('Specified user will be your opponent.').setRequired(true)),
        async execute(interaction, client) {

        const enemy = interaction.options.getUser('opponent');
        if (interaction.user.id === enemy.id) return await interaction.reply({ content: `You **cannot** play against yourself`, ephemeral: true });
        if (enemy.bot) return await interaction.reply({ content: `You **cannot** play against bot`, ephemeral: true });

        const game = new Connect4({
        message: interaction,
        isSlashGame: true,
        opponent: interaction.options.getUser('opponent'),
        embed: {
            title: "> Connect Four Game",
            rejectTitle: "**Cancelled Request**",
            statusTitle: "> Status",
            overTitle: "> Game Over",
            color: client.config.embedMiniGames,
            rejectColor: "Red",
        },
        emojis: {
            board: "🔵",
            player1: "🔴",
            player2: "🟡",
        },
        mentionUser: true,
        timeoutTime: 120000,
        buttonStyle: "PRIMARY",
        turnMessage: "> {emoji} | **{player}**, it is your turn!.",
        winMessage: "> 🎉 | **{player}** has won the Connect Four Game!",
        tieMessage: "> The game turned out to be a tie!",
        timeoutMessage: "> The game went unfinished! no one won the game!",
        playerOnlyMessage: "Only **{player}** and **{opponent}** can use these buttons.",
        rejectMessage: "**{opponent}** denied your request for a round of Connect Four!",
        });

        try {
            await game.startGame();
        } catch (err) {
            console.log(err);
            await interaction.reply('\`\`\`There was an error starting the game!\`\`\`');
        }
    },
};