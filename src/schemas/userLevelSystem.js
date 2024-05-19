const mongoose = require("mongoose");

const UserLevelSchema = new mongoose.Schema({
    Guild: String,
    User: String,
    XP: Number,
    Level: Number,
    Background: String,
    BarColor: String,
    BorderColor: String,
    Blur: Number,
});

module.exports = mongoose.model("UserLevel", UserLevelSchema);