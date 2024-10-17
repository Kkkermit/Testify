const GiveawaysManager = require("../utils/giveaway");

function giveawayClient(client) {
    client.giveawayManager = new GiveawaysManager(client, {
        default: {
            botsCanWin: false,
            embedColor: "#a200ff",
            embedColorEnd: "#550485",
            reaction: "🎉",
        },
    });
}

module.exports = giveawayClient;