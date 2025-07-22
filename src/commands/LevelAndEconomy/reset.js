const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const levelSchema = require ("../../schemas/userLevelSystem");
const ecoSchema = require ("../../schemas/economySystem");
const levelschema = require('../../schemas/levelSetupSystem');

module.exports = {
    usableInDms: false,
    category: "Level and Economy",
    permissions: [PermissionsBitField.Flags.Administrator],
    data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription(`Reset something in this server.`)
    .setDefaultMemberPermissions(PermissionsBitField.Administrator)
    .addSubcommand(command => command.setName('all-xp').setDescription('Resets all XP progress in this server.'))
    .addSubcommand(command => command.setName('all-currency').setDescription('Resets all economy progress in this server.'))
    .addSubcommand(command => command.setName('currency').setDescription(`Resets specified user's economy currency.`).addUserOption(option => option.setName('user').setDescription(`Specified user's economy account will be reset.`).setRequired(true)))
    .addSubcommand(command => command.setName('xp').setDescription(`Resets specified user's XP.`).addUserOption(option => option.setName('user').setDescription('Specified user will have their xp reset.').setRequired(true))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();
        
        switch (sub) {

            case 'all-xp':

            const levelsetup = await levelschema.findOne({ Guild: interaction.guild.id });
            if (!levelsetup || levelsetup.Disabled === 'disabled') return await interaction.reply({ content: `The **Administrators** of this server **have not** set up the **leveling system** yet!`, flags: MessageFlags.Ephemeral});

            levelSchema.deleteMany({ Guild: interaction.guild.id}, async (err, data) => {

                const embed = new EmbedBuilder()
                .setColor(client.config.embedLevels)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Leveling System Reset ${client.config.devBy}`})
                .setFooter({ text: `Leveling System XP Reset`})
                .setTimestamp()
                .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
                .addFields({ name: `Level data wiped`, value: `All the level data has been wiped from the server. Users XP has been reset to \`\`0\`\`.`})
    
                await interaction.reply({ embeds: [embed] })
    
            })

            break;
            case 'xp':

            const levelsetup1 = await levelschema.findOne({ Guild: interaction.guild.id });
            if (!levelsetup1 || levelsetup1.Disabled === 'disabled') return await interaction.reply({ content: `The **Administrators** of this server **have not** set up the **leveling system** yet!`, flags: MessageFlags.Ephemeral});

            const target = interaction.options.getUser('user');

            levelSchema.deleteMany({ Guild: interaction.guild.id, User: target.id}, async (err, data) => {

                const embed = new EmbedBuilder()
                .setColor(client.config.embedLevels)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Leveling System Reset ${client.config.devBy}`})
                .setFooter({ text: `Leveling System XP Reset`})
                .setTimestamp()
                .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
                .addFields({ name: `Level data wiped`, value: `${target.username}'s XP has been reset to \`\`0\`\`.`})

                await interaction.reply({ embeds: [embed] })

            })

            break;
            case 'currency':

            const user = interaction.options.getUser('user');

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`reset_user_confirm_${user.id}`)
                    .setLabel('Reset User Data')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            const userData = await ecoSchema.findOne({ Guild: interaction.guild.id, User: user.id });

            if (!userData) {
                return await interaction.reply({ 
                    content: `${user} needs to have **created** a past account in order to reset their currency.`, 
                    flags: MessageFlags.Ephemeral
                });
            }

            if (userData.Wallet + userData.Bank === 0) {
                return await interaction.reply({ 
                    content: `${user} has **no money**, you **do not** need to reset their money.`, 
                    flags: MessageFlags.Ephemeral
                });
            }

            const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Reset User Economy Data')
            .setDescription(`Are you sure you want to reset all economy data for **${user.tag}**?\n\n**Current Balance:**\n💰 Wallet: $${userData.Wallet.toLocaleString()}\n🏦 Bank: $${userData.Bank.toLocaleString()}\n\n**This action cannot be undone!**`)
            .setFooter({ text: 'Please confirm this action' })
            .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [confirmRow], flags: MessageFlags.Ephemeral });

            break;
            case 'all-currency':

            const confirmRowAll = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`reset_server_confirm_${interaction.guild.id}`)
                    .setLabel('YES, RESET ALL DATA')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('NO, CANCEL')
                    .setStyle(ButtonStyle.Success)
            );

            const embedAll = new EmbedBuilder()
            .setColor('DarkRed')
            .setTitle('⚠️ DANGER: Server-Wide Economy Reset')
            .setDescription(`**WARNING! You are about to reset ALL economy data for EVERY user in ${interaction.guild.name}!**\n\n**This will:**\n• Delete ALL user balances\n• Remove ALL wallet and bank data\n• Reset ALL economy statistics for EVERYONE\n\n**This action is IRREVERSIBLE and will affect all members!**\n\n**Are you absolutely sure you want to continue?**`)
            .setFooter({ text: 'THIS ACTION CANNOT BE UNDONE!' })
            .setTimestamp();

            await interaction.reply({ embeds: [embedAll], components: [confirmRowAll], flags: MessageFlags.Ephemeral });

            break;
        }
    }
}