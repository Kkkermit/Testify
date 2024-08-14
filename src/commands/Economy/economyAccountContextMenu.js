const { ContextMenuCommandBuilder, EmbedBuilder, ApplicationCommandType } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

module.exports = {
    data: new ContextMenuCommandBuilder()
    .setName('• Economy Account')
    .setType(ApplicationCommandType.User),
    async execute(interaction, client) {

        const { guild, user } = interaction;
        let data = await ecoS.findOne({ Guild: guild.id, User: user.id });

        if (!data) return await interaction.reply({ content: "Economy account not found, create one using \`/economy-create account\`", ephemeral: true });
        else {
            const embed = new EmbedBuilder()
            .setAuthor({ name: `Economy System ${client.config.devBy}` })
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .setDescription(`> Here is your account info:`)
            .setThumbnail(client.user.displayAvatarURL())
            .setColor(client.config.embedEconomy)
            .addFields(
                { name: "Current Account", value: [ `• 🏦 **$${data.Bank}** In Bank`, `• 💵 **$${data.Wallet}** In Cash`, `• 💰 **$${data.Wallet + data.Bank}** Overall`, ].join("\n"), inline: false },
                { name: "Personal Area", value: [ `• 🧑‍💻 **${data.CommandsRan}** {/} ran`, `• 🛠️ **${data.Moderated}** times (moderated)`, `• 🙏 **${data.Begged}** times begged`, `• 👷 **${data.Worked}** times worked (${data.HoursWorked} hrs)`, `• 🎰 **${data.Gambled}** times gambled` ].join("\n"), inline: false }
            )
            .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
            .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    }
}