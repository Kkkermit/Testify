const { Schema, model } = require("mongoose");

let schema = new Schema({
    GuildID: {
        type: String,
        required: true,
    },
    Roles: {
        type: Array,
        required: true,
    },
});

module.exports = model("autoRoles1742", schema);