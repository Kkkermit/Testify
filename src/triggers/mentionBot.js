const { Events, EmbedBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder,} = require("discord.js");
const guildSettingsSchema = require('../schemas/prefixSystem.js');

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client, interaction) {
        if (message.author.bot) return;
        if (message.content.includes(`<@${client.user.id}>`))  {

            const fetchGuildPrefix = await guildSettingsSchema.findOne({ Guild: message.guild.id });
            const guildPrefix = fetchGuildPrefix.Prefix;
        
            const pingEmbed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle("🏓 • Who mentioned me??")
            .setDescription(`Hey there **${message.author.username}**!, here is some useful information about me.\n ⁉️ • **How to view all commands?**\nEither use **/help-manual** or do / to view a list of all the commands!`)
            .addFields({ name: '**🌐 • Website:**', value: 'https://testify.lol/'})
            .addFields({ name: `**🏡 • Servers:**`, value: `${client.guilds.cache.size}`, inline: true })
            .addFields({ name: `**👥 • Users:**`, value: `${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)}`, inline: true})
            .addFields({ name: `**💣 • Commands:**`, value: `\`\`${client.commands.size}\`\` **Slash** & \`\`${client.pcommands.size}\`\` **Prefix**`, inline: true})
            .addFields({ name: `**📡 • Latency:**`, value: `\`\`${Math.round(client.ws.ping)}ms\`\``, inline: true})
            .addFields({ name: `**🕒 • Uptime:**`, value: `\`\`${client.uptime}\`\``, inline: true})
            .addFields({ name: `**🛎️ • Prefix:**`, value: `Server prefix is \`\`${guildPrefix}\`\``, inline: true})
            .setTimestamp()
            .setThumbnail(client.user.avatarURL())
            .setFooter({text: `Requested by ${message.author.username}.`})

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setEmoji("➕")
                    .setLabel("Invite")
                    .setURL(client.config.botInvite)
                    .setStyle(ButtonStyle.Link)
            );
            const buttons1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                .setEmoji("➕")
                .setLabel("Join Support Server")
                .setURL(client.config.botServerInvite)
                .setStyle(ButtonStyle.Link)
            );

            return message.reply({ embeds: [pingEmbed], components: [buttons, buttons1] });
        
        }
    },
};