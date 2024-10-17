const { Schema, model } = require('mongoose');
const config = require('../config.js')

let prefixSchema = new Schema({
    Guild: {
		type: String,
		required: true,
		index: true // this is just to speed up querying by the Guild
	},
    Prefix: {
        type: [String],
        default: [`${config.prefix[0]}`],
    },
});

module.exports = model('prefix', prefixSchema);