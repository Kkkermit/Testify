const { EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const petItems = require('../../utils/economyUtils/items/petItems');

module.exports = {
    name: 'rehome',
    aliases: ['giveuppet', 'abandonment'],
    description: 'Rehome your pet (WARNING: You will not receive a refund)',
    usableInDms: false,
    usage: '',
    category: 'Economy',
    async execute(message, client, args) {
        const guild = message.guild;
        const user = message.author;
        
        let userData = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!userData) {
            return message.reply("You don't have an economy account yet. Create one using economy create!");
        }

        if (!userData.Pet || !userData.Pet.id) {
            return message.reply("You don't have a pet to rehome.");
        }

        userData.CommandsRan += 1;
        await userData.save();
        
        const petDetails = petItems.getPetById(userData.Pet.id);
        if (!petDetails) {
            return message.reply("There was an error finding your pet's details. Please contact an administrator.");
        }
        
        const petName = userData.Pet.name || petDetails.name;
        
        const confirmEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('⚠️ Rehome Pet Confirmation')
            .setDescription(`Are you sure you want to rehome **${petName}** (${petDetails.emoji} ${petDetails.name})?\n\n**This action cannot be undone and you will not receive any refund.**\n\nType \`confirm\` to proceed or \`cancel\` to keep your pet.`)
            .setFooter({ text: 'You have 30 seconds to respond' })
            .setTimestamp();
            
        const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
        
        const filter = m => m.author.id === user.id && (m.content.toLowerCase() === 'confirm' || m.content.toLowerCase() === 'cancel');
        const collector = message.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', async m => {
            if (m.content.toLowerCase() === 'confirm') {
                const freshUserData = await economySchema.findOne({ Guild: guild.id, User: user.id });
                if (!freshUserData || !freshUserData.Pet || !freshUserData.Pet.id) {
                    return message.reply("You don't have a pet to rehome.");
                }
                
                freshUserData.Pet = {
                    id: null,
                    name: null,
                    type: null,
                    emoji: null,
                    happiness: 100,
                    hunger: 100,
                    purchasedAt: null,
                    lastFed: null,
                    lastWalked: null
                };
                
                await freshUserData.save();
                
                const successEmbed = new EmbedBuilder()
                    .setColor('Orange')
                    .setTitle('🐾 Pet Rehomed')
                    .setDescription(`You have rehomed ${petName}. They're now living happily with their new family.`)
                    .setTimestamp();
                
                return message.reply({ embeds: [successEmbed] });
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('🎉 Rehoming Cancelled')
                    .setDescription(`${petName} is happy to still be with you!`)
                    .setTimestamp();
                
                return message.reply({ embeds: [cancelEmbed] });
            }
        });
        
        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('Grey')
                    .setTitle('⏱️ Timed Out')
                    .setDescription('Rehoming cancelled due to timeout.')
                    .setTimestamp();
                
                message.reply({ embeds: [timeoutEmbed] }).catch(() => {});
            }
        });
    }
};
