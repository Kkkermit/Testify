const { Events, EmbedBuilder } = require('discord.js');
const { activeGames } = require('../../commands/Test/pokemon');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        
        const channelId = message.channelId;
        if (!activeGames.has(channelId)) return;
        
        const gameData = activeGames.get(channelId);
        if (!gameData.active) return;

        const guess = message.content.toLowerCase();
        
        if (guess === gameData.pokemon) {
            const revealEmbed = new EmbedBuilder()
                .setTitle('Correct! 🎉')
                .setDescription(`Congratulations ${message.author}! It was ${gameData.pokemon}!`)
                .setImage(gameData.sprite)
                .setColor('Green');

            const gameMessage = await message.channel.messages.fetch(gameData.messageId);
            await gameMessage.edit({
                embeds: [revealEmbed],
                components: []
            });

            activeGames.delete(channelId);

            setTimeout(() => {
                if (!activeGames.has(channelId)) {
                    const command = require('../../commands/Test/pokemon');
                    command.startNewRound(channelId, message.channel);
                }
            }, 3000);
        } else {
            await message.react('❌');
        }
    }
};