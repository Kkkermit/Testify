const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("impersonate")
    .setDescription("Makes you look like someone else")
    .addUserOption(option => option.setName("user").setDescription("Mention a user to impersonate").setRequired(true))
    .addStringOption(option => option.setName("message").setDescription("What message do you want the user to type?").setRequired(true)),

    async execute(interaction, client) {

        const { options } = interaction;

        const member = options.getUser("user");
        const message = options.getString("message");
        
        interaction.channel.createWebhook({ name: member.username, avatar: member.displayAvatarURL({ dynamic: true })}).then((webhook) => {
        
            webhook.send({ content: message });
            setTimeout(() => {
                webhook.delete();
            }, 3000);
        });
        
        interaction.reply({ content: `${member || "user"} has been successfully impersonated!`, ephemeral: true });
    },
};