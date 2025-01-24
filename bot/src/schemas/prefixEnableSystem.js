const mongoose = require('mongoose');

const prefixSetupSchema = new mongoose.Schema({
    Guild: String,
    Prefix: String,
    Enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('prefixSetupSchema', prefixSetupSchema);