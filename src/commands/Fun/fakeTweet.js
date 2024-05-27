const { SlashCommandBuilder } = require("discord.js");
const filter = require('../../jsons/filter.json');

module.exports = {
    data: new SlashCommandBuilder()
    .setName("fake-tweet")
    .setDescription("Make users tweet something ;)")
    .addStringOption(option => option.setName("tweet").setDescription("Tweet comment").setRequired(true))
    .addUserOption(option => option.setName("user").setDescription("Choose a user").setRequired(false)),
    async execute (interaction, client) {

        let tweet = interaction.options.getString("tweet");
        if (filter.words.includes(tweet)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});
        let user = interaction.options.getUser("user") || interaction.user;
        let avatarUrl = user.avatarURL({ extension: "jpg" });
        let canvas = `https://some-random-api.com/canvas/tweet?avatar=${avatarUrl}&displayname=${encodeURIComponent(user.username)}&username=${encodeURIComponent(user.username)}&comment=${encodeURIComponent(tweet)}`;

        await interaction.channel.sendTyping(), 
        await interaction.channel.send({ content: canvas });
        await interaction.reply({ content: "Message sent to channel", ephemeral: true});
    },
};