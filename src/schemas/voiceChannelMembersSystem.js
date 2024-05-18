const { model, Schema } = require("mongoose");

let voiceChannelSchema = new Schema({
    Guild: String,
    TotalChannel: String
})

module.exports = model("voiceChannelSchema", voiceChannelSchema);