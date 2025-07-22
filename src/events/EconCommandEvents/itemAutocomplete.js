const { Events } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isAutocomplete()) return;
        
        if (interaction.commandName !== 'use') return;
        
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name !== 'item') return;
        
        try {
            const userData = await economySchema.findOne({ Guild: interaction.guild.id, User: interaction.user.id });
            
            if (!userData || !userData.Inventory || userData.Inventory.length === 0) {
                return await interaction.respond([
                    { name: 'No usable items found', value: 'none' }
                ]);
            }
            
            const itemCounts = {};
            userData.Inventory.forEach(item => {
                const fullItem = shopItems.items.find(i => i.id === item.id);
                if (!fullItem) return; 
                
                if (!itemCounts[item.id]) {
                    itemCounts[item.id] = {
                        id: item.id,
                        name: fullItem.name,
                        emoji: fullItem.emoji,
                        count: 0,
                        usable: fullItem.usable
                    };
                }
                itemCounts[item.id].count++;
            });
            
            const usableItems = Object.values(itemCounts).filter(item => item.usable);
            
            if (usableItems.length === 0) {
                return await interaction.respond([
                    { name: 'No usable items found', value: 'none' }
                ]);
            }
            
            const filtered = usableItems.filter(item => 
                item.name.toLowerCase().includes(focusedOption.value.toLowerCase())
            );
            
            const options = filtered.map(item => ({
                name: `${item.emoji} ${item.name} (x${item.count})`,
                value: item.id
            }));
            
            await interaction.respond(options.slice(0, 25));
        } catch (error) {
            client.logs.error(`Error handling item autocomplete:`, error);
            
            await interaction.respond([
                { name: 'Error fetching items', value: 'error' }
            ]).catch(() => {});
        }
    }
};
