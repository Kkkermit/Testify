const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fetch = require('node-fetch');
const schedule = require('node-schedule');

// Export activeGames to be accessible by events
const activeGames = new Map();
let gameTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pokemon-guess')
        .setDescription('Start a Pokemon guessing game that runs every 5 hours'),
    activeGames,

    async execute(interaction, client) {
        const channelId = interaction.channelId;
        
        if (activeGames.has(channelId)) {
            return await interaction.reply('A Pokemon guessing game is already running in this channel!');
        }

        await interaction.reply('Pokemon guessing game started! A new Pokemon will appear every 5 hours.');
        await this.startNewRound(channelId, interaction.channel);

        schedule.scheduleJob('0 */5 * * *', () => {
            if (!activeGames.has(channelId)) {
                this.startNewRound(channelId, interaction.channel);
            }
        });
    },

    async startNewRound(channelId, channel) {
        if (gameTimeout) {
            clearTimeout(gameTimeout);
            gameTimeout = null;
        }

        try {
            const pokemonId = Math.floor(Math.random() * 898) + 1;
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
            const pokemon = await response.json();

            const silhouetteEmbed = new EmbedBuilder()
                .setTitle('Who\'s that Pokemon?')
                .setImage(pokemon.sprites.other['official-artwork'].front_default)
                .setColor('Blue')
                .setDescription('Guess the Pokemon by typing its name!')
                .setImage(pokemon.sprites.other['official-artwork'].front_default + '?brightness=0');

            const passButton = new ButtonBuilder()
                .setCustomId('pass_pokemon')
                .setLabel('Pass')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(passButton);

            const message = await channel.send({
                embeds: [silhouetteEmbed],
                components: [row]
            });

            activeGames.set(channelId, {
                pokemon: pokemon.name,
                messageId: message.id,
                sprite: pokemon.sprites.other['official-artwork'].front_default,
                active: true
            });

        } catch (error) {
            console.error('Error in Pokemon game:', error);
            activeGames.delete(channelId);
        }
    }
};