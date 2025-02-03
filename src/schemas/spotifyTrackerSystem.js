const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    spotifyAccessToken: { type: String },
    spotifyRefreshToken: { type: String },
    tokenExpiry: { type: Date }
});

module.exports = mongoose.model('User', userSchema);