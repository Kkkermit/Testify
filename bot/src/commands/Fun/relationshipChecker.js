const canvafy = require("canvafy");
const { SlashCommandBuilder } = require("discord.js");
const { color, getTimestamp } = require("../../utils/loggingEffects")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("relationship-checker")
        .setDMPermission(false)
        .setDescription("Shows the probability of two users being lovers!")
        .addUserOption(option => option.setName("user").setDescription("The 1st user you want to ship!").setRequired(true))
        .addUserOption(option => option.setName("member").setDescription("The 2nd user you want to ship!").setRequired(true)),
    async execute(interaction, client) {
        try {
            await interaction.deferReply();

            const user = interaction.options.getUser("user");
            const member = interaction.options.getUser("member");
            const userAvatar = user.displayAvatarURL({
                forceStatic: true,
                size: 1024,
                extension: "png",
            });
            const memberAvatar = member.displayAvatarURL({
                forceStatic: true,
                size: 1024,
                extension: "png",
            });

            const ship = await new canvafy.Ship()
                .setAvatars(userAvatar, memberAvatar)
                .setBorder("#f0f0f0")
                .setBackground(
                    "image",
                    "https://img.freepik.com/premium-vector/heart-cartoon-character-seamless-pattern-pink-background-pixel-style_618978-1727.jpg"
                )
                .setOverlayOpacity(0.5)
                .build();

            await interaction.editReply({ content: `Probability of **${user.username}** & **${member.username}** being lovers!`, files: [{ attachment: ship, name: `ship.png` }] });
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [ERROR] ${error.message}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '*Whoops*, looks like there was an error there. Try the command again, if it doesn\'t work, please submit a **bug report** using \`\`/bug-report\`\`', ephemeral: true });
            } else {
                await interaction.reply({ content: '*Whoops*, looks like there was an error there. Try the command again, if it doesn\'t work, please submit a **bug report** using \`\`/bug-report\`\`', ephemeral: true });
            }
        }
    },
};