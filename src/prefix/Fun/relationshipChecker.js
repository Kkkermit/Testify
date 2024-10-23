const canvafy = require("canvafy");

module.exports = {
    name: "relationship-checker",
    aliases: ["ship", "lovers", "rc"],
    async execute(message, client, args) {

        const user = message.mentions.users.first()
        const member = message.mentions.users.last() 

        if (!args[0]) return message.channel.send("Please mention **two** users to ship!")
        if (!user || !member) return message.channels.send("Please mention **two** users to ship!")

        const userAvatar = user.displayAvatarURL({
            forceStatic: true,
            size: 1024,
            extension: "png",
        });
        const memberAvatar = member.displayAvatarURL({
            forceStatic: true,
            size: 1024,
            extension: "png",
        });

        const ship = await new canvafy.Ship()
        .setAvatars(userAvatar, memberAvatar)
        .setBorder("#f0f0f0")
        .setBackground(
            "image",
            "https://img.freepik.com/premium-vector/heart-cartoon-character-seamless-pattern-pink-background-pixel-style_618978-1727.jpg"
        )
        .setOverlayOpacity(0.5)
        .build();

        await message.channel.send({ content: `Probability of **${user.username}** & **${member.username}** being lovers!`, files: [{ attachment: ship, name: `ship.png`, }] });
    },
};
