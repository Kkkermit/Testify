const { model, Schema } = require("mongoose");

let leftusers = new Schema({
    Guild: String,
    Key: String,
    User: String,
    Left: Boolean
})

module.exports = model("leftusers", leftusers);