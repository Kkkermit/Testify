const { Events } = require('discord.js');
const economySchema = require('../../schemas/economySchema');
const shopItems = require('../../utils/economyUtils/items/shopItems');

module.exports = {
    name: Events.ClientReady,
    once: false,
    async execute(client) {
        client.logs.info(`[PASSIVE_INCOME] Setting up passive income system...`);

        processPassiveIncome(client);

        setInterval(() => processPassiveIncome(client), 3600000);
        
        client.logs.success(`[PASSIVE_INCOME] Passive income system initialized.`);
    }
};

async function processPassiveIncome(client) {
    try {
        const users = await economySchema.find({
            $or: [
                { House: { $ne: null } },
                { Businesses: { $ne: [] } }
            ]
        });
        
        let totalProcessed = 0;
        let totalIncome = 0;
        
        for (const userData of users) {
            let userIncome = 0;
            let updateNeeded = false;
            
            if (userData.House) {
                const house = shopItems.houses.find(h => h.id === userData.House.id);
                if (house) {
                    userIncome += house.income;
                    updateNeeded = true;
                }
            }
            
            if (userData.Businesses && userData.Businesses.length > 0) {
                userData.Businesses.forEach(business => {
                    const businessDetails = shopItems.businesses.find(b => b.id === business.id);
                    if (businessDetails) {
                        userIncome += businessDetails.income;
                        updateNeeded = true;
                    }
                });
            }
            
            if (updateNeeded && userIncome > 0) {
                userData.Bank += userIncome;
                await userData.save();
                
                totalProcessed++;
                totalIncome += userIncome;
            }
        }
    } catch (error) {
        client.logs.error(`[PASSIVE_INCOME] Error processing passive income: ${error}`);
    }
}
