const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: 'reset',
    aliases: ['wipe', 'reseteconomy'],
    description: 'Reset economy data for a user or the entire server (Admin only)',
    usage: '<user|server> [user]',
    usableInDms: false,
    category: 'Economy',
    permissions: [PermissionFlagsBits.Administrator],
    async execute(message, client, args) {
        
        if (!args[0]) {
            return message.reply(`Incorrect usage. Format: \`${client.config.prefix}reset <user|server> [user]\``);
        }
        
        const subcommand = args[0].toLowerCase();
        
        if (subcommand === 'user') {
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                return message.reply("Please mention a valid user to reset.");
            }
            
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`reset_user_confirm_${targetUser.id}`)
                    .setLabel('Reset User Data')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            const embed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('⚠️ Reset User Economy Data')
                .setDescription(`Are you sure you want to reset all economy data for **${targetUser.tag}**?\n\n**This will:**\n• Reset their wallet and bank balance to 0\n• Remove all inventory items\n• Remove their job, house, and businesses\n• Reset all statistics\n\n**This action cannot be undone!**`)
                .setFooter({ text: 'Please confirm this action' })
                .setTimestamp();
                
            await message.reply({ embeds: [embed], components: [confirmRow] });
            
        } else if (subcommand === 'server') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`reset_server_confirm_${message.guild.id}`)
                    .setLabel('YES, RESET ALL DATA')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reset_cancel')
                    .setLabel('NO, CANCEL')
                    .setStyle(ButtonStyle.Success)
            );
            
            const embed = new EmbedBuilder()
                .setColor('DarkRed')
                .setTitle('⚠️ DANGER: Server-Wide Economy Reset')
                .setDescription(`**WARNING! You are about to reset ALL economy data for EVERY user in ${message.guild.name}!**\n\n**This will:**\n• Delete ALL user balances\n• Remove ALL inventory items from ALL users\n• Remove ALL houses, jobs, and businesses\n• Reset ALL statistics for EVERYONE\n\n**This action is IRREVERSIBLE and will affect ${message.guild.memberCount} members!**\n\n**Are you absolutely sure you want to continue?**`)
                .setFooter({ text: 'THIS ACTION CANNOT BE UNDONE!' })
                .setTimestamp();
                
            await message.reply({ embeds: [embed], components: [confirmRow] });
        } else {
            return message.reply(`Invalid subcommand. Use either \`${client.config.prefix}reset user @user\` or \`${client.config.prefix}reset server\`.`);
        }
    }
};
