const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    Guild: {
        type: String,
        required: true
    },
    Channel: {
        type: String,
        required: true
    },
    EnabledLogs: {
        type: [String],
        default: ["all"],
    }
});

module.exports = mongoose.model('AuditLogs', logSchema);
