const { model, Schema } = require('mongoose');

let botVoiceSchema = new Schema ({
    Guild: String,
    BotChannel: String
})

module.exports = model('botVoiceChannels', botVoiceSchema);