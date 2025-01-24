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