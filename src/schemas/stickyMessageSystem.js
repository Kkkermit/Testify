const { Schema, model } = require('mongoose');

let sticky = new Schema({
    Guild: String,
    Message: String,
    Channel: String,
    Count: Number,
    Cap: Number
});

module.exports = model('stickyschema', sticky);