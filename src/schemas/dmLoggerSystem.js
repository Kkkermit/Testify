const mongoose = require('mongoose');

const dmLogSchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true },
    authorId: { type: String, required: true },
    content: { type: String },
    timestamp: { type: Date, default: Date.now },
    hasAttachments: { type: Boolean, default: false },
    attachmentsData: { type: Array, default: [] }
});

module.exports = mongoose.model('DmLogger', dmLogSchema);
