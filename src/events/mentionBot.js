const { Events, EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const config = require('../config');

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client, interaction) {
        if (message.author.bot) return;
        if (message.content.includes(`<@${client.user.id}>`))  {
        
        const commands = client.commands;
        const commandList = commands.map((command) => `> **/${command.data.name}**: ${command.data.description}`).join('\n');
        
        const pingEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} | Developed By ${config.dev}`})
        .setTitle(`Hello I am ${client.user.username}, check out my commands below!`)
        .setDescription(`${commandList}`)
        .setColor(config.embedColor)
        .setFooter({ text: `Watching over ${client.commands.size} commands.`})
        .setTimestamp()

        return message.reply({ content: `Hey, <@${message.author.id}> pinged me!`, embeds: [pingEmbed]});
        
        }
    },
};