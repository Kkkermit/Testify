const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

var timeout = [];

module.exports = {
    data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit money from your wallet to bank.')
    .addNumberOption(option => option.setName('amount').setDescription('The amount to deposit').setRequired(true)),
    async execute(interaction, client) {

        const { options, guild, user } = interaction;
        let data = await ecoS.findOne({ Guild: guild.id, User: user.id });

        const amount = options.getNumber('amount');

        if (!data) return await interaction.reply({ content: "You don't have an account, create one using \`/economy-create account.\`", ephemeral: true });
        else {
            if (data.Wallet < amount) return await interaction.reply({ content: `You're trying to deposit $${amount} while you only have $${data.Wallet} available to do so...`})

            data.Wallet -= amount;
            data.Bank += amount;
            data.CommandsRan += 1;
            data.save();

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Economy System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setColor(client.config.embedEconomy)
                .setDescription(`> You successfully deposited **$${amount}** to your wallet \n\n• Run \`/account view\` to view your new info.`)
                .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
                .setTimestamp()

            await interaction.reply({ embeds: [embed] });
        }
    }
}