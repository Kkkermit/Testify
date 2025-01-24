const { model, Schema } = require("mongoose");

let warningSchema = new Schema({
    GuildID: String,
    UserID: String,
    UserTag: String,
    Content: [
        {
            ExecuterId: String,
            ExecuterTag: String,
            Reason: String,
            WarnID: String,
            Timestamp: { type: Number, default: () => Date.now() },
            Edits: [
                {
                    EditedByExecuterId: String,
                    EditedByExecuterTag: String,
                    NewReason: String,
                    OldReason: String,
                    EditTimestamp: { type: Number, default: () => Date.now() } 
                }
            ]
        }
    ]
});

module.exports = model("warnTutorial", warningSchema);