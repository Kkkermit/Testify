const mongoose = require('mongoose');

const guildChannelSchema = new mongoose.Schema({
    User: String,
    Channel: String,
    Guild: String,
    MessageId: String
});

module.exports = mongoose.model('guildChannelSchema', guildChannelSchema);