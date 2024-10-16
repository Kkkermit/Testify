const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios')

module.exports = {
    data: new SlashCommandBuilder() 
    .setName('movie-tracker')
    .setDescription('Gets information about a movie')
    .addStringOption(option => option.setName('name').setDescription('The name of the movie').setRequired(true)),
    async execute(interaction, client) {

        const apiKey = process.env.movietrackerapi
        if (!apiKey) {
            client.logs.error("[COMMAND_ERROR] No API key has been provided for the movie tracker API! Double check your .env file and make sure it is correct. If your unsure where to get this, please refer to the post installation guide by running 'npm run postinstall'.");
            return
        }

        const { options } = interaction;
        
        const name = options.getString("name")
        const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(name)}`
        
        const response = await axios.get(apiUrl); {
            const movie = response.data.results[0]

            if (movie) {

                const embed = new EmbedBuilder()
                .setAuthor({ name: `Movie Tracker Command ${client.config.devBy}`})
                .setTitle(`${client.user.username} Movie Tracker Tool ${client.config.arrowEmoji}`)
                .setDescription(`> **${movie.title}**`)
                .setImage(`https://image.tmdb.org/t/p/w500${movie.poster_path}`)
                .addFields(
                    { name: "**Release Date**", value: `> ${movie.release_date}` },
                    { name: "**Overview**", value: `> ${movie.overview}` },
                    { name: "**Popularity**", value: `> ${movie.popularity} /100` },
                    { name: "**Language**", value: `> ${movie.original_language}` },
                    { name: "**Average Vote**", value: `> ${movie.vote_average} /10` },
                    { name: "**Age Rating**", value: `> Adult - ${movie.adult}` })
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})
                .setColor(client.config.embedInfo)
                .setTimestamp();

                await interaction.reply({ embeds: [embed]}).catch((err) => { 
                    interaction.editReply({ content: `An **error** occurred!\n> **Error**: ${err}`, ephemeral: true});
                });

            } else {
                await interaction.reply({ content: "A movie with that name was not found!", ephemeral: true}).catch((err) => { 
                    interaction.editReply({ content: `An **error** occurred!\n> **Error**: ${err}`, ephemeral: true});
                });
            }
        } 
    }
}