const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

var timeout = [];

module.exports = {
    data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily boost.'),
    async execute(interaction, client) {

        const { guild, user } = interaction;
        
        let data = await ecoS.findOne({ Guild: guild.id, User: user.id });

        if (timeout.includes(interaction.user.id)) return await interaction.reply({ content: "You've already used \`/daily\` today. Come back in **24hrs**", ephemeral: true });

        if (!data) return await interaction.reply({ content: "You don't have an account, create one using \`/economy-create account.\`", ephemeral: true });
        else {
            const randAmount = Math.round((Math.random() * 3000) + 10);

            data.Bank += randAmount;
            data.CommandsRan += 1;
            data.save();

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Economy System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setColor(client.config.embedEconomy)
                .setDescription(`> You claimed your daily boost!\n\n• Amount: **$${randAmount}**\n• Next claim available: **24 hours**`)
                .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            timeout.push(interaction.user.id);
            setTimeout(() => {
                timeout.shift();
            }, 86400000);
        }
    }
}