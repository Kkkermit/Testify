const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: true,
    category: 'Community',
    data: new SlashCommandBuilder()
    .setName('minecraft')
    .setDescription('Get info about a Minecraft user or server.')
    .addSubcommand(command => command.setName('skin').setDescription('Get a users minecraft skin!').addStringOption(option => option.setName('username').setDescription('Minecraft username').setRequired(true)))
    .addSubcommand(command => command.setName('server').setDescription('Get info about a Minecraft server!').addStringOption(option => option.setName('ip').setDescription('Minecraft server IP').setRequired(true))),
    async execute(interaction, client) {
    
        const sub = interaction.options.getSubcommand();

        switch(sub) {
            case 'skin':
                const username = interaction.options.getString('username');

                const embed = new EmbedBuilder()
                .setAuthor({ name: `🎮 Minecraft Skin Finder ${client.config.devBy}`, iconURL: 'https://www.minecraft.net/etc.clientlibs/minecraft/clientlibs/main/resources/img/menu/menu-buy--reversed.gif' })
                .setTitle(`👤 ${username}'s Minecraft Skin`)
                .setDescription(`> 🔍 Showing skin info for **${username}**\n> 📋 Use \`/minecraft skin <username>\` to check other skins`)
                .setImage(`https://minotar.net/armor/body/${username}/300.png`)
                .setColor(client.config.embedCommunity)
                .addFields(
                    { name: '📝 Download Options', value: `[Download Skin](https://mineskin.org/search?q=${username}) | [View in 3D](https://namemc.com/profile/${username})`, inline: false },
                    { name: '🔗 Related Links', value: `[Minecraft.net](https://www.minecraft.net) | [Mojang Account](https://account.mojang.com)`, inline: false }
                )
                .setFooter({ text: `🕰️ Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.displayAvatarURL()}` })
                .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                break;
                
            case 'server':
                await interaction.deferReply();

                const ip = interaction.options.getString(`ip`);
                const url = `https://api.mcsrvstat.us/2/${ip}`;
    
                try {
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    const isServerUp = data.online !== false && (data.ip || (data.players && data.players.online !== undefined));
                    
                    if (!isServerUp) {
                        return await interaction.editReply({
                            content: `❌ The server **${ip}** appears to be offline or doesn't exist. Please check the IP address and try again.`,
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    
                    const serverIp = data.hostname || ip;
                    const realIp = data.ip || 'Unknown';
                    const port = data.port || '25565';
                    const version = data.version || 'Unknown';
                    const onlinePlayers = data.players?.online || 0;
                    const maxPlayers = data.players?.max || 0;
                    const motd = data.motd?.clean?.[0] || 'No description available';
                    
                    const progressBarLength = 10;
                    const filledBars = Math.round((onlinePlayers / Math.max(maxPlayers, 1)) * progressBarLength) || 0;
                    const emptyBars = progressBarLength - filledBars;
                    const progressBar = '🟩'.repeat(filledBars) + '⬜'.repeat(emptyBars);
                    
                    const statusEmoji = '🟢';
                    const playerPercentage = Math.round((onlinePlayers / Math.max(maxPlayers, 1)) * 100);
                    
                    const serverEmbed = new EmbedBuilder()
                        .setColor(client.config.embedCommunity)
                        .setAuthor({ name: `🎮 Minecraft Server Info ${client.config.devBy}` })
                        .setTitle(`🖥️ ${serverIp} Server Status`)
                        .setDescription(`${statusEmoji} **Server is online!** Here's what we found:\n\n> "${motd}"`)
                        .setThumbnail(`https://api.mcsrvstat.us/icon/${ip}`)
                        .addFields(
                            { name: '📋 Server Details', value: `\`\`\`\n🔹 Address: ${serverIp}\n🔹 Version: ${version}\n\`\`\``, inline: false },
                            { name: '🌐 Network Info', value: `> IP: \`${realIp}\`\n> Port: \`${port}\``, inline: false },
                            { name: `👥 Players (${onlinePlayers}/${maxPlayers}) - ${playerPercentage}% Full`, value: `${progressBar}\n\`${onlinePlayers}\` out of \`${maxPlayers}\` players online`, inline: false }
                        )
                        .setFooter({ text: `🕰️ Server data last refreshed`, iconURL: client.user.avatarURL() })
                        .setTimestamp();
                        
                    serverEmbed.addFields({ 
                        name: '🎮 How to Join', 
                        value: `Launch Minecraft, go to Multiplayer and add a new server with the address:\n\`\`\`\n${serverIp}\n\`\`\``, 
                        inline: false 
                    });
                
                    const refreshButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`minecraft-refresh_${ip}`)
                                .setLabel('🔄 Refresh Server Info')
                                .setStyle(ButtonStyle.Primary)
                        );
                
                    await interaction.editReply({ 
                        embeds: [serverEmbed],
                        components: [refreshButton]
                    });
                } catch (error) {
                    console.error('Minecraft server info error:', error);
                    await interaction.editReply({
                        content: `❌ Failed to fetch server information. The server **${ip}** might not exist or cannot be reached. Please verify the IP address and try again.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
                
            default:
                await interaction.reply({
                    content: '❓ Invalid subcommand. Please use `/minecraft skin <username>` or `/minecraft server <ip>`.', 
                    flags: MessageFlags.Ephemeral
                });
        }
    }
};