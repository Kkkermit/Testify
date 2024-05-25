const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'help',
  aliases: ['h', 'cmd', 'command'],
  async execute(message, client, args) {

    message.channel.send({
      embeds: [
        new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} ${client.config.devBy}`})
        .setTitle(`${client.user.username} **prefix** commands | **My prefix**: \`\`${client.config.prefix}\`\``)
        .setDescription(client.pcommands.map(cmd => `> ${cmd.name}`).join('\n'))
        .setColor(client.config.embedColor)
        .setFooter({ text: `Watching over ${client.pcommands.size} commands.`})
        .setTimestamp()
      ]
    });
  }
};
