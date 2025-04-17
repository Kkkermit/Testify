const { EmbedBuilder, MessageFlags } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects');
const updateYTDLPackages = require('../../scripts/ytdlUpdater');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song from YouTube or Spotify.',
  usage: 'play <song_name/url>',
  category: 'Music',
  inVoiceChannel: true,
  usableInDms: false,
  async execute(message, client, args) {
    const string = args.join(' ');

    if (!string) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.embedMusic)
            .setDescription(`${client.config.musicEmojiError} | Please **enter a song url** or query to search.`)
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!client.distube || typeof client.distube.play !== 'function') {
      console.error(`${color.red}[${getTimestamp()}] [MUSIC] DisTube not properly initialized${color.reset}`);

      await message.channel.send('⚠️ Music system needs to be updated. Updating packages...');
      updateYTDLPackages();
      
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.embedMusic)
            .setDescription(`${client.config.musicEmojiError} | Music system is updating. Please try again in a moment.`)
        ]
      });
    }
    
    try {
      const loadingMsg = await message.channel.send(`🔍 Searching for \`${string}\`...`);

      await client.distube.play(message.member.voice.channel, string, {
        member: message.member,
        textChannel: message.channel,
        message
      });

      setTimeout(() => {
        loadingMsg.delete().catch(() => {});
      }, 5000);
      
    } catch (error) {
      console.error(`${color.red}[${getTimestamp()}] [MUSIC] Play error: ${error}${color.reset}`);

      if (error.toString().includes('ytdl-core') || error.toString().includes('ytsr')) {
        message.channel.send('⚠️ Music system needs to be updated. Updating packages...');
        updateYTDLPackages();
        
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(client.config.embedMusic)
              .setDescription(`${client.config.musicEmojiError} | Please try again in a moment after the update is complete.`)
          ]
        });
      }
      
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(client.config.embedMusic)
            .setDescription(`${client.config.musicEmojiError} | Error: ${error.message}`)
        ]
      });
    }
  }
}
