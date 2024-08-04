const { Events } = require('discord.js');
const voiceSchema = require('../../schemas/voiceChannelMembersSystem');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute (member, client, err) {

        if (member.guild === null) return;
        const voiceData = await voiceSchema.findOne({ Guild: member.guild.id });

        if (!voiceData) return;
        else {

            const totalVoiceChannel = member.guild.channels.cache.get(voiceData.TotalChannel);
            if (!totalVoiceChannel || totalVoiceChannel === null) return;
            const totalMembers = member.guild.memberCount;

            totalVoiceChannel.setName(`• Total Members: ${totalMembers}`).catch(err);
        }
    }
}

module.exports = {
    name: Events.GuildMemberRemove,
    async execute (member, client, err) {

        if (member.guild === null) return;
        const voiceData1 = await voiceSchema.findOne({ Guild: member.guild.id });

        if (!voiceData1) return;
        else {

            const totalVoiceChannel1 = member.guild.channels.cache.get(voiceData1.TotalChannel);
            if (!totalVoiceChannel1 || totalVoiceChannel1 === null) return;
            const totalMembers1 = member.guild.memberCount;

            totalVoiceChannel1.setName(`• Total Members: ${totalMembers1}`).catch(err);
        }
    }
}