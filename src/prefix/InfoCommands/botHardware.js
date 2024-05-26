const { EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    name: "bot-specs",
    aliases: ["bs", "bot-hardware"], 

    async execute(message, client) {
        const usage2 = process.memoryUsage();
        const usage = process.cpuUsage();
        const usagePercent = usage.system / usage.user * 100;
        const usagePercent2 = usage2.system / usage2.user * 100;
        const memoryUsed = (os.totalmem - os.freemem)/1000000000;
        const memoryTotal = os.totalmem()/1000000000;

        const specsEmbed = new EmbedBuilder()
        .setTitle('💻 **Bots specs**')
        .setThumbnail(client.user.avatarURL())
        .setAuthor({ name: `${client.user.username} bots spec command ${client.config.devBy}`})
        .setColor(client.config.embedInfo)
        .setFooter({ text: `Specs command`})
        .addFields({name: `Memory:`, value: `> ${(memoryUsed/memoryTotal * 100).toFixed(1)}%`})
        .addFields({name: 'OS:', value: `> ${os.type}`})
        .addFields({name: `OS Version:`, value: `> ${os.release}`})
        .addFields({name: 'CPU: ', value: `> ${usagePercent.toFixed(1)}%`, inline: true})
        .addFields({name: 'CPU Type (Arch): ', value: `> ${os.arch}`, inline: true})
        .setTimestamp()

        await message.channel.send({ embeds: [specsEmbed] });
    }
}