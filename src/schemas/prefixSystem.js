const { Schema, model } = require('mongoose');
const config = require('../config.js')

let prefixSchema = new Schema({
    Guild: String,
    Prefix: {
        type: String,
        default: `${config.prefix}`, 
    },
});

module.exports = model('prefix', prefixSchema);;