const { SlashCommandBuilder } = require(`discord.js`);
const { FastType } = require('discord-gamecord');

module.exports = {
    data: new SlashCommandBuilder()
    .setName(`fast-type`)
    .setDescription(`Play a game of Fast Type!`),
    async execute (interaction, client) {

        const fastTypeSentences = [
            'A really cool sentence to fast type.',
            'A sentence that is really cool to type fast.',
            'A cool sentence to type really fast.',
            'A sentence that is cool to type really fast.',
            'A sentence that is cool to type fast.',
            'A sentence that is really cool to type fast.',
            'A sentence for you to type really fast.',
            'A sentence for you to type fast.',
            'Type this sentence really fast.',
            'Type this sentence fast.',
            'Type this really fast.',
            'Type this fast.',
            'Fast type this sentence.',
            'Really fast type this sentence.',
            'Fast type this.',
            'Really fast type this.',
        ];

        const sentence = fastTypeSentences[Math.floor(Math.random() * fastTypeSentences.length)]

        const game = new FastType({
            message: interaction,
            isSlashGame: true,
            embed: {
                title: '> Fast Type',
                color: client.config.embedMiniGames,
                description: 'You have **{time}** seconds to type the sentence below.'
            },
            timeoutTime: 60000,
            sentence: sentence,
            winMessage: '> 🎉 | You won! You finished the type race in **{time}** seconds with **{wpm}** wpm.',
            loseMessage: `> You lost, you couldn't type the correct sentence in time.`,
            timeoutMessage: '> The game went unfinished.',
        });
        
        try {
            await game.startGame();
        } catch (err) {
            console.log(err);
            await interaction.reply('\`\`\`There was an error starting the game!\`\`\`');
        }
    }
}