const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer money to another user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to transfer money to')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Amount to transfer')
                .setMinValue(1)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('source')
                .setDescription('Source of funds')
                .setRequired(true)
                .addChoices(
                    { name: 'Wallet', value: 'wallet' },
                    { name: 'Bank', value: 'bank' }
                )),
        
    async execute(interaction, client) {
        const { guild, user } = interaction;
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const source = interaction.options.getString('source');
        
        if (targetUser.id === user.id) {
            return interaction.reply({
                content: "You can't transfer money to yourself!",
                ephemeral: true
            });
        }
        
        if (targetUser.bot) {
            return interaction.reply({
                content: "You can't transfer money to bots!",
                ephemeral: true
            });
        }
        
        let senderData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!senderData) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }
        
        let recipientData = await economySchema.findOne({ Guild: guild.id, User: targetUser.id });
        
        if (!recipientData) {
            return interaction.reply({
                content: `${targetUser.username} doesn't have an economy account yet.`,
                ephemeral: true
            });
        }
        
        const sourceField = source === 'wallet' ? 'Wallet' : 'Bank';
        if (senderData[sourceField] < amount) {
            return interaction.reply({
                content: `You don't have enough money in your ${source}. You only have $${senderData[sourceField].toLocaleString()}.`,
                ephemeral: true
            });
        }
        
        const fee = Math.ceil(amount * 0.01);
        const transferAmount = amount - fee;
        
        senderData[sourceField] -= amount;
        senderData.CommandsRan += 1;
        await senderData.save();
        
        recipientData.Wallet += transferAmount;
        await recipientData.save();
        
        const embed = new EmbedBuilder()
            .setColor(client.config.embedEconomyColor || '#00FF00')
            .setTitle('💸 Transfer Successful')
            .setDescription(`You have transferred money to ${targetUser.username}!`)
            .addFields(
                { name: '💰 Amount Sent', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '💵 Transfer Fee (1%)', value: `$${fee.toLocaleString()}`, inline: true },
                { name: '🏦 Amount Received', value: `$${transferAmount.toLocaleString()}`, inline: true },
                { name: '👤 Recipient', value: `${targetUser.username}`, inline: true },
                { name: '💳 Source', value: source === 'wallet' ? 'Wallet' : 'Bank', inline: true }
            )
            .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
            .setTimestamp();
            
        try {
            const recipient = await guild.members.fetch(targetUser.id);
            if (recipient) {
                const notificationEmbed = new EmbedBuilder()
                    .setColor(client.config.embedEconomyColor || '#00FF00')
                    .setTitle('💰 Money Received')
                    .setDescription(`You've received a money transfer from ${user.username}!`)
                    .addFields(
                        { name: '💵 Amount', value: `$${transferAmount.toLocaleString()}`, inline: true },
                        { name: '👤 From', value: `${user.username}`, inline: true }
                    )
                    .setFooter({ text: `The money has been added to your wallet` })
                    .setTimestamp();
                
                recipient.send({ embeds: [notificationEmbed] }).catch(() => {
                });
            }
        } catch (error) {}
        
        return interaction.reply({ embeds: [embed] });
    }
};
