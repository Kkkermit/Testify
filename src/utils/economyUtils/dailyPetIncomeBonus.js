const economySchema = require('../../schemas/economySchema');
const { color, getTimestamp} = require('../loggingEffects')
const petItems = require('./items/petItems');

async function applyPetIncomeBonus(guildId) {
    try {
        const usersWithPets = await economySchema.find({
            Guild: guildId,
            'Pet.id': { $ne: null }
        });
        
        if (!usersWithPets || usersWithPets.length === 0) {
            return { success: true, count: 0, total: 0 };
        }
        
        let successCount = 0;
        let totalBonus = 0;
        
        for (const userData of usersWithPets) {
            try {
                if (!userData.Pet || !userData.Pet.id) continue;
                
                const pet = petItems.getPetById(userData.Pet.id);
                if (!pet || !pet.incomeBonus) continue;
                
                const happinessMultiplier = Math.max(0.5, userData.Pet.happiness / 100);
                const hungerMultiplier = Math.max(0.5, userData.Pet.hunger / 100);
                
                const adjustedBonus = Math.floor(pet.incomeBonus * happinessMultiplier * hungerMultiplier);
                
                userData.Bank += adjustedBonus;
                
                await userData.save();
                successCount++;
                totalBonus += adjustedBonus;
            } catch (err) {
                console.error(`${color.red}[${getTimestamp()}] [ECONOMY] Error processing pet income for user ${userData.User}: ${color.reset}`, err);
            }
        }
        
        return { success: true, count: successCount, total: totalBonus };
    } catch (error) {
        console.error(`${color.red}[${getTimestamp()}] [ECONOMY] Error applying pet income bonuses: ${color.reset}`, error);
        return { success: false, count: 0, total: 0, error };
    }
}

module.exports = {
    applyPetIncomeBonus
};
