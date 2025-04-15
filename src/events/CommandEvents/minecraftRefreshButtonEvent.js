const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton() || !interaction.customId.startsWith('minecraft-refresh_')) {
            return;
        }

        const ip = interaction.customId.split('_')[1];
        
        await interaction.deferUpdate();
        
        try {
            const url = `https://api.mcsrvstat.us/2/${ip}`;
            const response = await fetch(url);
            const data = await response.json();
            
            const isServerUp = data.online !== false && (data.ip || (data.players && data.players.online !== undefined));
            
            if (!isServerUp) {
                return await interaction.editReply({
                    content: `❌ The server **${ip}** appears to be offline or doesn't exist.`,
                    embeds: [],
                    components: []
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
            
            const updatedEmbed = new EmbedBuilder()
                .setColor(client.config.embedCommunity)
                .setAuthor({ name: `🎮 Minecraft Server Info ${client.config.devBy}` })
                .setTitle(`🖥️ ${serverIp} Server Status`)
                .setDescription(`${statusEmoji} **Server is online!** Here's what we found:\n\n> "${motd}"`)
                .setThumbnail(`https://api.mcsrvstat.us/icon/${ip}`)
                .addFields(
                    { name: '📋 Server Details', value: `\`\`\`\n🔹 Address: ${serverIp}\n🔹 Version: ${version}\n\`\`\``, inline: false },
                    { name: '🌐 Network Info', value: `> IP: \`${realIp}\`\n> Port: \`${port}\``, inline: false },
                    { name: `👥 Players (${onlinePlayers}/${maxPlayers}) - ${playerPercentage}% Full`, value: `${progressBar}\n\`${onlinePlayers}\` out of \`${maxPlayers}\` players online`, inline: false },
                    { 
                        name: '🎮 How to Join', 
                        value: `Launch Minecraft, go to Multiplayer and add a new server with the address:\n\`\`\`\n${serverIp}\n\`\`\``, 
                        inline: false 
                    }
                )
                .setFooter({ text: `🕰️ Server data refreshed`, iconURL: client.user.avatarURL() })
                .setTimestamp();
            
            const refreshButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`minecraft-refresh_${ip}`)
                        .setLabel('🔄 Refresh Server Info')
                        .setStyle(ButtonStyle.Primary)
                );
            
            await interaction.editReply({
                embeds: [updatedEmbed],
                components: [refreshButton]
            });
            
        } catch (error) {
            console.error('Minecraft server refresh error:', error);
            
            const retryButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`minecraft-refresh_${ip}`)
                        .setLabel('🔄 Retry')
                        .setStyle(ButtonStyle.Danger)
                );
            
            const originalEmbeds = interaction.message.embeds;
            await interaction.editReply({
                content: `❌ Failed to refresh server information for **${ip}**. Please try again.`,
                embeds: originalEmbeds,
                components: [retryButton]
            });
        }
    }
};
