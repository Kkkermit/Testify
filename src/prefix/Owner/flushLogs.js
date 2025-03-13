const { EmbedBuilder } = require("discord.js");
const { flushLogs } = require('../../scripts/consoleLogger');
const { color, getTimestamp } = require('../../utils/loggingEffects');

module.exports = {
  name: 'flushlogs',
  aliases: ['sendlogs', 'pushlogs'],
  async execute(message, client, args) {
    try {

      if (!client.config.developers.includes(message.author.id)) {
        return message.channel.send(`${client.config.ownerOnlyCommand}`);
      }

      console.log(`${color.blue}[${getTimestamp()}] [LOGS] Manually flushing logs to Discord${color.reset}`);
      
      await message.channel.send(`Sending logs to webhook...`);
      
      flushLogs(true);
      
      const embed = new EmbedBuilder()
        .setAuthor({ name: `Flush Logs Command ${client.config.devBy}` })
        .setTitle(`${client.user.username} Flush logs ${client.config.arrowEmoji}`)
        .setColor(client.config.embedDev)
        .setDescription(`${client.config.countSuccessEmoji} Logs have been successfully sent to the Discord webhook.`)
        .setTimestamp()
        .setFooter({ text: `${client.user.username} | ${client.config.botVersion}` });
      
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`${color.red}[${getTimestamp()}] [LOGS] Error flushing logs: ${error}${color.reset}`);
      message.channel.send(`${client.config.errorEmoji} Failed to send logs: ${error.message}`);
    }
  }
};
