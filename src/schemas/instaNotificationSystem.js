const mongoose = require('mongoose');

const instagramSchema = new mongoose.Schema({
    Guild: { type: String, required: true },
    Channel: { type: String, required: true },
    InstagramUsers: [{ type: String }],
    LastPostDates: { type: Map, of: Date, default: new Map() }
});

module.exports = mongoose.model('InstagramNotifications', instagramSchema);