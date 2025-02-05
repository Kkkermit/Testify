const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    spotifyAccessToken: String,
    spotifyRefreshToken: String,
    tokenExpiry: Date
});

module.exports = mongoose.model('SpotifyUser', userSchema);