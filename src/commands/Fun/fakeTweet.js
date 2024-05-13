const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("fake-tweet")
    .setDescription("Make users tweet something ;)")
    .addStringOption(option => option.setName("tweet").setDescription("Tweet comment").setRequired(true))
    .addUserOption(option => option.setName("user").setDescription("Choose a user").setRequired(false)),
    async execute (interaction) {

        let tweet = interaction.options.getString("tweet");
        let user = interaction.options.getUser("user") || interaction.user;
        let avatarUrl = user.avatarURL({ extension: "jpg" });
        let canvas = `https://some-random-api.com/canvas/tweet?avatar=${avatarUrl}&displayname=${encodeURIComponent(user.username)}&username=${encodeURIComponent(user.username)}&comment=${encodeURIComponent(tweet)}`;

        await interaction.channel.sendTyping(), 
        await interaction.channel.send({ content: canvas });
        await interaction.reply({ content: "Message sent to channel", ephemeral: true});
    },
};