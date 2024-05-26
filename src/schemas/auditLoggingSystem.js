const { model, Schema } = require("mongoose");

let logschema = new Schema({
    Guild: String,
    Channel: String,
});

module.exports = model("logs", logschema);