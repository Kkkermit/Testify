const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    favoriteSong: { type: String, required: true },
    about: { type: String, required: true },
    birthday: { type: Date, required: false },
    hobbies: { type: String, required: false },
    favoriteGame: { type: String, required: false },
    createdAt: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
