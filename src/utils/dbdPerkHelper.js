const dbdPerks = require('../jsons/dbdPerks.json')

function findPerkKeyByName(perkName) {
    if (!perkName) return null;
    const normalizedSearchName = perkName.toLowerCase().trim();
    
    for (const [key, data] of Object.entries(dbdPerks)) {
        if (data.name && data.name.toLowerCase() === normalizedSearchName) {
            return key;
        }
    }
    
    for (const [key, data] of Object.entries(dbdPerks)) {
        if (data.name && data.name.toLowerCase().includes(normalizedSearchName)) {
            return key;
        }
    }
    
    return null;
};


module.exports = { findPerkKeyByName};