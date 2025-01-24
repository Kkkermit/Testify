const { model, Schema } = require('mongoose');

let setupChannelSchema = new Schema({
    serverID: String,
    channelID: String,
    instruction: String,
});

module.exports = model('SetupChannel', setupChannelSchema);