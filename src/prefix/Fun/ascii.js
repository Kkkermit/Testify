const { EmbedBuilder } = require('discord.js');
const figlet = require('figlet')
const filter = require('../../jsons/filter.json');

module.exports = {
    name: 'ascii',
    aliases: ['ascii-art'],
    description: 'Convert text to ASCII art',
    usage: 'ascii <text>',
    category: 'Fun',
    usableInDms: true,
    async execute(message, client, args) {

        const text = args.join(" ");

        figlet(`${text}`, function (err, data) {

            if (err) {
                return message.channel.send(`Something has gone wrong, please try again!`)
            }

            if (filter.words.includes(text)) return message.channel.send(`**Cannot** send your message as it includes **explicit** language`);

            const embed = new EmbedBuilder()
            .setColor(client.config.embedFun)
            .setTimestamp()
            .setDescription(`\`\`\`${data}\`\`\``)

            message.channel.send({ embeds: [embed] });
        });
    }
}