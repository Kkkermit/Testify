const {model, Schema} = require('mongoose');

let levelsetup = new Schema({
    Guild: String,
    Disabled: String,
    Role: String,
    Multi: String
});

module.exports = model('levelsetup', levelsetup);