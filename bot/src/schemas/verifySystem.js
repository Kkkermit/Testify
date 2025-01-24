const { model, Schema } = require("mongoose");

let verify = new Schema({
    Guild: String,
    Channel: String,
    Role: String,
    Message: String,
    Verified: Array
})

module.exports = model("verify", verify);