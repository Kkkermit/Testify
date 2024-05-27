const { model, Schema } = require("mongoose");

let verifyusers = new Schema({
    Guild: String,
    Key: String,
    User: String
})

module.exports = model("verifyusers", verifyusers);