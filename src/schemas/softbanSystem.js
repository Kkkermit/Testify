const { model, Schema } = require('mongoose');

const softbanSchema = new Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, default: 'No reason provided' },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    deleteMessageSeconds: { type: Number, default: 0 }
});

softbanSchema.index({ guildId: 1, userId: 1, isActive: 1 });

module.exports = model('SoftbanEntry', softbanSchema);
