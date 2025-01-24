const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'iq',
    async execute(message, client, args) {

        const user = message.mentions.users.first() || message.author;

        const minIQ = 2;
        const maxIQ = 200;
        const randomIQ = Math.floor(Math.random() * (maxIQ - minIQ + 1)) + minIQ;
        let response = `${user}'s IQ is ${randomIQ}.`;

        if (randomIQ >= 80) {
            response = `> ${user}'s IQ is high **${randomIQ}** You're a genius! 🧠`;
        } else if (randomIQ <= 50) {
            response = `> ${user}'s IQ is low **${randomIQ}** Keep learning and growing! 📚`;
        }

        const embed = new EmbedBuilder()
        .setAuthor({ name: `IQ Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} IQ Tool ${client.config.arrowEmoji}`)
        .setDescription(`Checking IQ for ${user}`)
        .setColor(client.config.embedFun)
        .addFields({name: '• IQ level', value: (response)})
        .setTimestamp()
        .setFooter({text: `Requested by ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true })})
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))

        await message.channel.send({ embeds: [embed] });
    }
}