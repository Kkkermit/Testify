const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const superagent = require("superagent");

module.exports = {
    usableInDms: true,
    category: "Community",
    data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Displays the lyrics from the given song")
    .addStringOption(options => options.setName("song").setDescription("What is the song? You can also include the artist for a better search!").setRequired(true)),
    async execute(interaction, client) {

    const song = interaction.options.getString("song");

    await interaction.deferReply();
    try {
        let { body } = await superagent.get(
            `https://some-random-api.com/lyrics?title=${song}`
        );

        const MAX_CHARS = 1024;
        let lyrics = body.lyrics;
        const lyricFields = [];

        while (lyrics.length) {
            lyricFields.push({
                name: "Lyrics:",
                value: lyrics.substring(0, MAX_CHARS),
            });
            lyrics = lyrics.substring(MAX_CHARS);
        }

        const lyricEmbed = new EmbedBuilder()
        .setTitle(`${client.user.username} Lyrics Tool ${client.config.arrowEmoji}`)
        .setDescription(`**${song}** Lyrics: `)
        .setColor(client.config.embedCommunity)
        .setThumbnail(body.thumbnail.genius)
        .setImage(body.thumbnail.genius)
        .setURL(body.links.genius)
        .setAuthor({ name: `Lyrics command ${client.config.devBy}`, iconURL: `${client.user.avatarURL()}`})
        .addFields(
            { name: "Title:", value: `${body.title}`, inline: true },
            { name: "Artist:", value: `${body.author}`, inline: true },
            ...lyricFields
        )
        .setFooter({ text: `Disclaimer - ${body.disclaimer}` })
        .setTimestamp();

        interaction.followUp({ embeds: [lyricEmbed] });
        
        } catch (error) {
            console.log(error);
            interaction.followUp({ content: "An error occurred, try again later!", flags: MessageFlags.Ephemeral });
        }
    },
};