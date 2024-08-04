const { Events } = require('discord.js');
const botSchema = require('../../schemas/voiceChannelBotSystem');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute (member, client, err) {

        if (member.guild === null) return;
        const botData = await botSchema.findOne({ Guild: member.guild.id });

        if (!botData) return;
        else {

            const botVoiceChannel = member.guild.channels.cache.get(botData.BotChannel);
            if (!botVoiceChannel || botVoiceChannel === null) return;
            const botsList = member.guild.members.cache.filter(member => member.user.bot).size;

            botVoiceChannel.setName(`• Total Bots: ${botsList}`).catch(err);

        }
    }
}

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