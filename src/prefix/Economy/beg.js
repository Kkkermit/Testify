const { EmbedBuilder, MessageFlags } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

var timeout = [];

module.exports = {
    name: 'beg',
    aliases: ['begging'],
    description: 'Beg for money',
    usage: 'beg',
    category: 'Economy',
    usableInDms: true,
    async execute(message, client, args) {

        const { guild, author } = message;
        let data = await ecoS.findOne({ Guild: guild.id, user: author.id });

        if (timeout.includes(message.author.id)) return await message.reply({ content: "Come back soon to beg **(1 min)**", flags: MessageFlags.Ephemeral });

        if (!data) return await message.reply({ content: "You don't have an account, create one using \`/economy-create account.\`", flags: MessageFlags.Ephemeral });
        else {
            const randAmount = Math.round((Math.random() * 750) + 10);

            data.CommandsRan += 1;
            data.Begged += 1;
            data.Wallet += randAmount;
            data.save()

            const embed = new EmbedBuilder()
            .setAuthor({ name: `Economy System ${client.config.devBy}` })
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .setDescription(`> You just begged and were **successful**:\n\n• Begged Amount: **$${randAmount}**\n• Timed begged: **${data.Begged}**`)
            .setFooter({ text: `Come back in 1 minute and run /beg` })
            .setColor(client.config.embedEconomy)
            .setTimestamp()
            .setThumbnail(client.user.displayAvatarURL());

            await message.channel.send({ embeds: [embed] });

            timeout.push(message.author.id);
            setTimeout(() => {
                timeout.shift();
            }, 60000);
        }
    }
}