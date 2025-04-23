const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    usableInDms: false,
    category: "Moderation",
    permissions: [PermissionFlagsBits.ModerateMembers],
    data: new SlashCommandBuilder()
    .setName('mod-panel')
    .setDescription('Moderate a member with various punishment options.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option => option.setName("user").setDescription("The user you want to moderate").setRequired(true)),
    async execute(interaction, client) {

        const target = await interaction.options.getUser('user');
        const member = await interaction.options.getMember('user');
        const guild = interaction.guild;
        
        if (!member) {
            return await interaction.reply({ 
                content: "This user is not a member of this server.", 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (interaction.member.id === member.id) {
            return await interaction.reply({ 
                content: "You cannot moderate yourself.", 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return await interaction.reply({ 
                content: "You cannot moderate a member with the same or higher role than you.", 
                flags: MessageFlags.Ephemeral 
            });
        }
        
        if (!member.moderatable) {
            return await interaction.reply({ 
                content: "I don't have permission to moderate this user. Their role may be higher than mine.", 
                flags: MessageFlags.Ephemeral 
            });
        }
        
        const panelId = Date.now().toString();

        const mod_panel = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username} Moderation Panel` })
            .setTitle(`> ${client.config.modEmojiHard} Moderation Panel ${client.config.arrowEmoji}`)
            .setThumbnail(member.displayAvatarURL({ size: 1024, format: 'png', dynamic: true }))
            .addFields(
                { name: `Target User`, value: `> ${target} (${target.tag})`, inline: true },
                { name: `Target ID`, value: `> \`${target.id}\``, inline: true },
                { name: `Instructions`, value: `> Select an action below. You will be prompted for additional details as needed.` }
            )
            .setFooter({ text: `Moderation panel ${client.config.devBy} • Panel ID: ${panelId}` })
            .setTimestamp()
            .setColor(client.config.embedModHard);

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`modpanel_${panelId}_${interaction.user.id}_${target.id}_timeout`)
                    .setEmoji('⏳')
                    .setLabel('Timeout')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`modpanel_${panelId}_${interaction.user.id}_${target.id}_kick`)
                    .setEmoji('🦵')
                    .setLabel('Kick')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`modpanel_${panelId}_${interaction.user.id}_${target.id}_ban`)
                    .setEmoji('🔨')
                    .setLabel('Ban')
                    .setStyle(ButtonStyle.Danger),
            );
            
        const secondRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`modpanel_${panelId}_${interaction.user.id}_${target.id}_softban`)
                    .setEmoji('🧹')
                    .setLabel('Soft Ban')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`modpanel_${panelId}_${interaction.user.id}_${target.id}_delete`)
                    .setEmoji('✖️')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            );

        if (!client.modPanels) client.modPanels = new Map();
        
        client.modPanels.set(panelId, {
            moderatorId: interaction.user.id,
            moderatorTag: interaction.user.tag,
            targetId: target.id,
            targetTag: target.tag,
            memberId: member.id,
            guildId: guild.id,
            guildName: guild.name,
            messageId: null,
            createdAt: Date.now(),
            expiryTimeout: setTimeout(() => {
                if (client.modPanels.has(panelId)) {
                    client.modPanels.delete(panelId);
                    client.logs.info(`[MOD_PANEL] Panel ${panelId} expired and was removed from cache`);
                }
            }, 180000)
        });

        const response = await interaction.reply({ 
            embeds: [mod_panel], 
            components: [actionButtons, secondRow]
        }).then(() => interaction.fetchReply());
        
        if (client.modPanels.has(panelId)) {
            const panelData = client.modPanels.get(panelId);
            panelData.messageId = response.id;
            client.modPanels.set(panelId, panelData);
        }
    }
};