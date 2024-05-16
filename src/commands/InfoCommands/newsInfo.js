const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios')

const NewsAPIKEY = process.env.newstrackerapi
const NewsAPIEndpoint = 'https://newsapi.org/v2/top-headlines';

module.exports = {
    data: new SlashCommandBuilder()
    .setName('news-tracker')
    .setDescription('Get the latest news'),
    async execute(interaction, client) {
        
        const response = await axios.get(NewsAPIEndpoint, {
            params: {
                country: 'gb',
                apiKey: NewsAPIKEY,
            },
        });

        if (response.data.articles && response.data.articles.length > 0) {
            const articles = response.data.articles;
            const randomIndex = Math.floor(Math.random() * articles.length);
            const randomArticle = articles[randomIndex];

            const embed = new EmbedBuilder()
            .setAuthor({ name: `News Tracker Command ${client.config.devBy}`})
            .setTitle(`${client.user.username} News Tracker Tool ${client.config.arrowEmoji}`)
            .setDescription(`> **${randomArticle.title}**`)
            .addFields(
                { name: "**Author**", value: `> ${randomArticle.author}` },
                { name: "**Source**", value: `> ${randomArticle.source.id} & ${randomArticle.source.name}` },
                { name: "**Published**", value: `> ${randomArticle.publishedAt}` })
            .setURL(randomArticle.url)
            .setThumbnail(client.user.avatarURL())
            .setTimestamp()
            .setColor(client.config.embedInfo)
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })})

            await interaction.reply({ embeds: [embed]}).catch((err) => {
                interaction.editReply({ content: `An **error** occurred!\n> **Error**: ${err}`, ephemeral: true});
            });
        }
    }
}