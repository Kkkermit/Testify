const mongoose = require('mongoose');

const treasureConfigSchema = new mongoose.Schema({
    Guild: { type: String, required: true, unique: true },
    Enabled: { type: Boolean, default: true },
    MinMessages: { type: Number, default: 15 },
    MaxMessages: { type: Number, default: 50 },
    MinAmount: { type: Number, default: 10 },
    MaxAmount: { type: Number, default: 500 },
    Cooldown: { type: Number, default: 300000 },
    CreatedBy: { type: String, required: true },
    CreatedAt: { type: Date, default: Date.now },
    LastModifiedBy: { type: String, required: true },
    LastModifiedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TreasureConfig', treasureConfigSchema);
