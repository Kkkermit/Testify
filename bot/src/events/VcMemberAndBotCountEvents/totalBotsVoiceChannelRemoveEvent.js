const { Events } = require('discord.js');
const botSchema = require('../../schemas/voiceChannelBotSystem');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute (member, client, err) {

        if (member.guild === null) return;
        const botData1 = await botSchema.findOne({ Guild: member.guild.id });

        if (!botData1) return;
        else {

            const botVoiceChannel1 = member.guild.channels.cache.get(botData1.BotChannel);
            if (!botVoiceChannel1 || botVoiceChannel1 === null) return;
            const botsList1 = member.guild.members.cache.filter(member => member.user.bot).size;

            botVoiceChannel1.setName(`• Total Bots: ${botsList1}`).catch(err);
        
        }
    }
}