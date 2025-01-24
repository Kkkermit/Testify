const { model, Schema } = require('mongoose');

let TicketSetup = new Schema({
    GuildID: String,
    Channel: String,
    Category: String,
    Transcripts: String,
    Handlers: String,
    Everyone: String,
    Description: String,
    Button: String,
    Emoji: String,
})

module.exports = model('TicketSetup', TicketSetup);