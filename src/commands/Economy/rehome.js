const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('rehome')
        .setDescription('Rehome your pet (WARNING: You will not receive a refund)'),
        
    async execute(interaction, client) {
        const { guild, user } = interaction;
        
        let userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!userData) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }

        if (!userData.Pet || !userData.Pet.id) {
            return interaction.reply({
                content: "You don't have a pet to rehome.",
                ephemeral: true
            });
        }

        userData.CommandsRan += 1;
        await userData.save();
        
        const petDetails = petItems.getPetById(userData.Pet.id);
        if (!petDetails) {
            return interaction.reply({
                content: "There was an error finding your pet's details. Please contact an administrator.",
                ephemeral: true
            });
        }
        
        const petName = userData.Pet.name || petDetails.name;
        
        const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rehome_confirm_${user.id}`)
                .setLabel('Confirm Rehoming')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`rehome_cancel_${user.id}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        const embed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Rehome Pet Confirmation')
            .setDescription(`Are you sure you want to rehome **${petName}** (${petDetails.emoji} ${petDetails.name})?\n\n**This action cannot be undone and you will not receive any refund.**`)
            .setFooter({ text: 'Please confirm this action' })
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], components: [confirmRow], ephemeral: true });
    }
};
