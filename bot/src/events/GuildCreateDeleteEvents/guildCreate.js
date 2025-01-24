const { Events, EmbedBuilder } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: Events.GuildCreate,
    async execute (guild, client) {
    const logchannelid = client.config.botJoinChannel;

    if (!logchannelid) {
        client.logs.error(`[GUILD_CREATE] No log channel ID provided. Please provide a valid channel ID in the config.js file.`);
        return;
    }

    let theowner = process.env.devid; 
    if (!theowner) {
        client.logs.warn(`[GUILD_CREATE] No owner ID provided. Please provide a valid owner ID in the .env file.`);
    }

    let invite;
    let invalidInv = 'Failed to create an invite for this server!'
    try {
        const channel2 = await guild.channels.cache.random()
        const channelId = channel2.id;
        invite = await guild.invites.create(channelId);
    } catch (error) {
        client.logs.warn(`[INVITE_ERROR] Failed to create an invite for ${guild.name}!`)
    }

    const inviteLink = invite ? invite.url : invalidInv;

    await guild.fetchOwner().then(({ user }) => { theowner = user; }).catch(() => {});

    let embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle(`__**Joined a New Server**__`)
    .setDescription(`${guild.name} has invited ${client.user.username} into their server`)
    .addFields(
        { name: "Guild Info", value: `>>> \`\`\`${guild.name} (${guild.id})\`\`\`` },
        { name: "Owner Info", value: `>>> \`\`\`${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`}\`\`\`` },
        { name: "Member Count", value: `>>> \`\`\`${guild.memberCount}\`\`\`` },
        { name: "Server Number", value: `>>> \`\`\`${client.guilds.cache.size}\`\`\`` },
        { name: "Server Invite", value: `>>> \`\`\`${inviteLink}\`\`\`` })
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: `Orbit ${client.guilds.cache.size}`, iconURL: client.user.avatarURL({ dynamic: true }) })
    .setTimestamp();

    const LogChannel = client.channels.cache.get(logchannelid) || await client.channels.fetch(logchannelid).catch(() => {}) || false;
    if (LogChannel) LogChannel.send({ embeds: [embed] }).catch(console.warn);

    console.log(`${color.orange}[${getTimestamp()}]${color.reset} [GUILD_CREATE] ${client.user.username} has been added to a new guild. \n${color.orange}> GuildName: ${guild.name} \n> GuildID: ${guild.id} \n> Owner: ${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`} \n> MemberCount: ${guild.memberCount} \n> ServerNumber: ${client.guilds.cache.size} \n> ServerInvite: ${inviteLink} ${color.reset}`);
    }
}
