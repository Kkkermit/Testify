const mongoose = require('mongoose');

const prefixSetupSchema = new mongoose.Schema({
	Guild: {
		type: String,
		required: true,
		index: true // this is just to speed up querying by the Guild
	},
    Prefix: {
        type: [String],
        default: [`${config.prefix[0]}`],
    },
    Enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('prefixSetupSchema', prefixSetupSchema);