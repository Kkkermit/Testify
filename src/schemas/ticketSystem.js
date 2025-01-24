const { model, Schema } = require('mongoose');

let TicketSchema = new Schema({
    GuildID: String,
    OwnerID: String,
    MembersID: [String],
    TicketID: String,
    ChannelID: String,
    Locked: Boolean,
    Claimed: Boolean,
    ClaimedBy: String
});

module.exports = model('Ticket', TicketSchema); 