const mongoose = require("mongoose");

const welcomeMessageSchema = new mongoose.Schema({
    guildId: String,
    channelId: String,
    message: String,
    isEmbed: { type: Boolean, default: false },
});

module.exports = mongoose.model("WelcomeMessage", welcomeMessageSchema);
