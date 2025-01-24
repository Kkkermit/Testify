const { model, Schema } = require("mongoose");

let blacklist = new Schema({
    userId: String,
    reason: String
});

module.exports = model("blacklist", blacklist);