const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        
        if (!interaction.customId.startsWith('guildlist-')) return;
        
        try {
            const [prefix, action, userId] = interaction.customId.split('-');
            
            if (userId !== interaction.user.id) {
                return await interaction.reply({ content: '❌ These buttons are not for you!', flags: MessageFlags.Ephemeral });
            }
            
            const message = interaction.message;
            
            let metadata = { page: 1, pages: 1 };
            
            const messages = await message.channel.messages.fetch({ 
                limit: 10,
                around: message.id
            });
            
            for (const [id, msg] of messages) {
                if (msg.author.id === client.user.id && msg.content) {
                    const match = msg.content.match(/```json\n(.*)\n```/s);
                    if (match && match[1]) {
                        try {
                            const parsed = JSON.parse(match[1]);
                            if (parsed.userId === userId) {
                                metadata = parsed;
                                break;
                            }
                        } catch (e) {}
                    }
                }
            }
            
            if (!metadata.pages || metadata.pages === 1) {
                const footer = message.embeds[0]?.footer?.text;
                if (footer) {
                    const match = footer.match(/Page (\d+)\/(\d+)/);
                    if (match) {
                        metadata.page = parseInt(match[1]);
                        metadata.pages = parseInt(match[2]);
                    }
                }
            }
            
            let currentPage = metadata.page;
            const totalPages = metadata.pages;
            
            let newPage = currentPage;
            
            switch(action) {
                case 'first':
                    newPage = 1;
                    break;
                case 'prev':
                    newPage = Math.max(currentPage - 1, 1);
                    break;
                case 'next':
                    newPage = Math.min(currentPage + 1, totalPages);
                    break;
                case 'last':
                    newPage = totalPages;
                    break;
                case 'refresh':
                    break;
                default:
                    return;
            }
            
            if (newPage !== currentPage || action === 'refresh') {
                await interaction.deferUpdate();
                
                const guilds = client.guilds.cache;
                const pageSize = 5;
                
                const start = (newPage - 1) * pageSize;
                const end = newPage * pageSize;
                
                let guildList = "";
                let index = 1;
                
                for (const [guildId, guild] of guilds) {
                    try {
                        const owner = await guild.fetchOwner().catch(() => null);
                        
                        if (!owner) {
                            continue;
                        }
                        
                        if (index > end) break;
                        if (index > start) {
                            guildList += `**Guild**: ${guild.name} (${guildId})\n`;
                            guildList += `**Members**: ${guild.memberCount}\n`;
                            guildList += `**Owner**: ${owner.user.tag} (${owner.user.id})\n`;

                            let bot = guild.members.cache.get(client.user.id);
                            
                            if (bot && bot.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
                                const inviteChannel = guild.channels.cache.find((c) => c.type === 0 && c.permissionsFor(bot).has(PermissionsBitField.Flags.CreateInstantInvite));
                                
                                if (inviteChannel) {
                                    try {
                                        const invite = await inviteChannel.createInvite({ maxAge: 86400, maxUses: 1 });
                                        guildList += `**Invite**: ${invite.url}\n\n`;
                                    } catch {
                                        guildList += "**Invite**: Failed to create invite\n\n";
                                    }
                                } else {
                                    guildList += "**Invite**: No suitable channel found\n\n";
                                }
                            } else {
                                guildList += "**Invite**: Missing permissions\n\n";
                            }
                        }
                        index++;
                    } catch (err) {
                        client.logs.error(`[GUILD_LIST] Error processing guild ${guildId}:`, err);
                        continue;
                    }
                }
                
                if (!guildList) {
                    guildList = "No guilds to display on this page.";
                }

                const embed = EmbedBuilder.from(message.embeds[0])
                    .setDescription(guildList)
                    .setFooter({ text: `Page ${newPage}/${totalPages} • Total Guilds: ${guilds.size}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`guildlist-first-${userId}`)
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(newPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`guildlist-prev-${userId}`)
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(newPage === 1),
                    new ButtonBuilder()
                        .setCustomId(`guildlist-refresh-${userId}`)
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`guildlist-next-${userId}`)
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(newPage === totalPages),
                    new ButtonBuilder()
                        .setCustomId(`guildlist-last-${userId}`)
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(newPage === totalPages)
                );

                await interaction.editReply({ 
                    embeds: [embed], 
                    components: [buttons]
                });
            }
        } catch (error) {
            client.logs.error("[GUILD_LIST] Guild list pagination error:", error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "❌ An error occurred while navigating guild pages.", flags: MessageFlags.Ephemeral});
                }
            } catch (replyError) {
                client.logs.error("[GUILD_LIST] Error sending error response:", replyError);
            }
        }
    },
};
