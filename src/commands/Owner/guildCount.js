const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("guild-list")
    .setDescription("Lists all guilds the bot is in (OWNER ONLY COMMAND).")
    .setDefaultMemberPermissions(PermissionsBitField.Administrator),
    async execute(interaction, client) {
        
        try {
            if (interaction.user.id !== client.config.developers) {
                return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, ephemeral: true,});
            }

            const guilds = client.guilds.cache;
            const pageSize = 5;
            const pages = Math.ceil(guilds.size / pageSize);
            let page = 1;
            const start = (page - 1) * pageSize;
            const end = page * pageSize;

            let guildList = "";
            let index = 1;

            for (const [guildId, guild] of guilds) {
                const owner = guild.members.cache.get(guild.ownerId);

                if (!owner) continue;
                if (index > end) break;
                if (index > start) {

                    guildList += `**Guild**: ${guild.name} (${guildId})\n`;
                    guildList += `**Members**: ${guild.memberCount}\n`;
                    guildList += `**Owner**: ${owner.user.tag} (${owner.user.id})\n`;

                    let bot = guild.members.cache.get(client.user.id);
                    
                    if (bot.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
                        const inviteChannel = guild.channels.cache.find((c) => c.type === 0);
                            if (inviteChannel) {
                                const invite = await inviteChannel.createInvite();
                                
                                guildList += `**Invite**: ${invite.url}\n\n`;
                            } else {
                                guildList += "**Invite**: Invite cannot be generated\n\n";
                            }
                    } else {
                        guildList += "**Invite**: Bot does not have permission to create invites\n\n";
                    }
                }  
                index++;
            }

            const embed = new EmbedBuilder()
            .setAuthor({ name: `Guild List Command ${client.config.devBy}` })
            .setTitle(`${client.user.username} Guild List Tool ${client.config.arrowEmoji}`)
            .setDescription(guildList)
            .setColor(client.config.embedDev)
            .setFooter({ text: `Page ${page}/${pages}` })
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });

            if (pages > 1) {
                await msg.react("⬅️");
                await msg.react("➡️");

                const filter = (reaction, user) =>
                    ["⬅️", "➡️"].includes(reaction.emoji.name) && user.id === interaction.user.id;
                    
                const collector = msg.createReactionCollector({ filter, time: 30000 });

                collector.on("collect", async (reaction) => {
                    if (reaction.emoji.name === "⬅️" && page > 1) {
                        page--;
                    } else if (reaction.emoji.name === "➡️" && page < pages) {
                        page++;
                    } else if (reaction.emoji.name === "⬅️" && page === 1) {
                        page = pages;
                    } else if (reaction.emoji.name === "➡️" && page === pages) {
                        page = 1;
                    }

                    const newStart = (page - 1) * pageSize;
                    const newEnd = page * pageSize;

                    guildList = "";
                    index = 1;

                    for (const [guildId, guild] of guilds) {
                        const owner = guild.members.cache.get(guild.ownerId);

                        if (!owner) continue;
                        if (index > newEnd) break;
                        if (index > newStart) {

                            guildList += `**Guild**: ${guild.name} (${guildId})\n`;
                            guildList += `**Members**: ${guild.memberCount}\n`;
                            guildList += `**Owner**: ${owner.user.tag} (${owner.user.id})\n`;
                            
                            let bot = guild.members.cache.get(client.user.id);
                            
                            if (bot.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
                                const inviteChannel = guild.channels.cache.find((c) => c.type === 0);
                                    if (inviteChannel) {
                                        const invite = await inviteChannel.createInvite();
                                        
                                        guildList += `**Invite**: ${invite.url}\n\n`;
                                    } else {
                                        guildList += "**Invite**: Invite cannot be generated\n\n";
                                    }
                            } else {
                                guildList += "**Invite**: Bot does not have permission to create invites\n\n";
                            }
                        }
                        index++;
                    }   
                    embed
                    .setDescription(guildList)
                    .setFooter({ text: `Page ${page}/${pages}` });
                
                    await msg.edit({ embeds: [embed] });
                    await reaction.users.remove(interaction.user);
                    collector.resetTimer();
                });
            
                collector.on("end", async () => {
                    msg.reactions.removeAll().catch(console.error);
                    
                    embed.setFooter({ text: `Page ${page}/${pages} (Inactive)` });
                    await msg.edit({ embeds: [embed] });
                });
            }
        } catch (error) {
            client.logs.error(error);
            return interaction.reply({ content: "[GUILD_LIST] An error has occurred", ephemeral: true });
        }
    },
};