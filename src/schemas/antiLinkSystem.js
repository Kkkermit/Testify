const {model, Schema} = require('mongoose');

let linkSchema = new Schema({
    Guild: String,
    Perms: String
});

module.exports = model('links', linkSchema);