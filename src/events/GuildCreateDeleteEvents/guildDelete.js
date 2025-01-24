const { Events, EmbedBuilder } = require('discord.js');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: Events.GuildDelete,
    async execute (guild, client) {
    const logchannelid = client.config.botLeaveChannel;

    if (!logchannelid) {
        client.logs.error(`[GUILD_DELETE] No log channel ID provided. Please provide a valid channel ID in the config.js file.`);
        return;
    }

    let theowner = process.env.devid;
    if (!theowner) {
        client.logs.warn(`[GUILD_CREATE] No owner ID provided. Please provide a valid owner ID in the .env file.`);
    }

    await guild.fetchOwner().then(({ user }) => { theowner = user; }).catch(() => {});

    let embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle(`__**Left a Server**__`)
    .setDescription(`${guild.name} has kicked/ban ${client.user.username} out of their server`)
    .addFields(
        { name: "Guild Info", value: `>>> \`\`\`${guild.name} (${guild.id})\`\`\`` },
        { name: "Owner Info", value: `>>> \`\`\`${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`}\`\`\`` },
        { name: "Member Count", value: `>>> \`\`\`${guild.memberCount}\`\`\`` },
        { name: "Server Number", value: `>>> \`\`\`${client.guilds.cache.size}\`\`\`` })
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: `${client.user.username} ${client.guilds.cache.size}`, iconURL: client.user.avatarURL({ dynamic: true }) })
    .setTimestamp();

    const LogChannel = client.channels.cache.get(logchannelid) || await client.channels.fetch(logchannelid).catch(() => {}) || false;
    if (LogChannel) LogChannel.send({ embeds: [embed] }).catch(console.warn);

    console.log(`${color.blue}[${getTimestamp()}]${color.reset} [GUILD_DELETE] ${client.user.username} has left a guild. \n${color.blue}> GuildName: ${guild.name} \n> GuildID: ${guild.id} \n> Owner: ${theowner ? `${theowner.tag} (${theowner.id})` : `${theowner} (${guild.ownerId})`} \n> MemberCount: ${guild.memberCount} ${color.reset}`);
    }
}
