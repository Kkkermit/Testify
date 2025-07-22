const mongoose = require('mongoose');

const economySchema = new mongoose.Schema({
    Guild: { type: String, required: true },
    User: { type: String, required: true },
    Bank: { type: Number, default: 0 },
    Wallet: { type: Number, default: 0 },
    Worked: { type: Number, default: 0 },
    Gambled: { type: Number, default: 0 },
    Begged: { type: Number, default: 0 },
    DailyStreak: { type: Number, default: 0 },
    LastDaily: { type: Date, default: null },
    HoursWorked: { type: Number, default: 0 },
    LastWorked: { type: Date, default: null },
    CommandsRan: { type: Number, default: 0 },
    Moderated: { type: Number, default: 0 },
    Inventory: { type: Array, default: [] },
    Job: { type: String, default: "Unemployed" },
    JobLevel: { type: Number, default: 0 },
    House: { type: Object, default: null },
    Businesses: { type: Array, default: [] },
    RobberySuccess: { type: Number, default: 0 },
    RobberyFailed: { type: Number, default: 0 },
    LastRobbed: { type: Date, default: null },
    LastRobbedBy: { type: String, default: null },
    HeistSuccess: { type: Number, default: 0 },
    HeistFailed: { type: Number, default: 0 },
    LastHeist: { type: Date, default: null },
    Pet: { 
        id: { type: String, default: null },
        name: { type: String, default: null },
        type: { type: String, default: null },
        emoji: { type: String, default: null },
        happiness: { type: Number, default: 100 },
        hunger: { type: Number, default: 100 },
        purchasedAt: { type: Date, default: null },
        lastFed: { type: Date, default: null },
        lastWalked: { type: Date, default: null }
    }
});

module.exports = mongoose.model('Economy', economySchema);
