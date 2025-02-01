const mongoose = require('mongoose');

const valorantUserSchema = new mongoose.Schema({
    userId: String,
    accessToken: String,
    entitlementToken: String,
    userUUID: String,
    expires: Date
});

module.exports = mongoose.model('ValorantUser', valorantUserSchema);