const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    usableInDms: true,
    category: "Community",
    data: new SlashCommandBuilder()
    .setName("dad-joke")
    .setDescription("Get a random dad joke."),
    async execute(interaction, client) {

        const response = await fetch("https://icanhazdadjoke.com/", {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) { 
            return interaction.reply({ content: `An **error occurred** while attempting to fetch a dad joke. Please try again later.`, flags: MessageFlags.Ephemeral });
        }

        const data = await response.json();

        const jokeEmbed = new EmbedBuilder()
        .setAuthor({ name: `Dad Joke ${client.config.devBy}`})
        .setTitle(`${client.user.username} Dad Joke ${client.config.arrowEmoji}`)
        .setDescription(`> ${data.joke}`)
        .setColor(client.config.embedCommunity)
        .setFooter({ text: `Joke ID: ${data.id}` })
        .setThumbnail(client.user.avatarURL())
        .setTimestamp();

        interaction.reply({ embeds: [jokeEmbed] });
    },
};