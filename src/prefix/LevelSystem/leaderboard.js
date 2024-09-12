const UserLevel = require("../../schemas/userLevelSystem");
const canvafy = require("canvafy");

module.exports = {
    name: "leaderboard",
    aliases: ["lb"],
    async execute(message, client) {
    
        const users = await UserLevel.find({
            Guild: message.guild.id,
        }).sort({ Level: -1 });
    
        if (users.length === 0) {
            await message.channel.send({ content: "There are no users in the ranking yet." });
            return;
        }
    
        const usersData = await Promise.all(
            users.map(async (user, index) => {
                const fetchedUser = await client.users.fetch(user.User);
                return {
                    top: index + 1,
                    avatar: `https://cdn.discordapp.com/avatars/${user.User}/${fetchedUser.avatar}.png`,
                    tag: fetchedUser.username,
                    score: user.Level.toString(),
                };
            })
        );

        const limitedUsersData = usersData.slice(0, 10);

        const top = await new canvafy.Top()
        .setOpacity(0.5)
        .setScoreMessage("Level")
        .setBackground(
            "image",
            "https://img.freepik.com/free-photo/ultra-detailed-nebula-abstract-wallpaper-4_1562-749.jpg"
        )
        .setColors({
            box: "#212121",
            username: "#ffffff",
            score: "#ffffff",
            firstRank: "#f7c716",
            secondRank: "#9e9e9e",
            thirdRank: "#94610f",
        })
        .setUsersData(limitedUsersData)
        .build();

        await message.channel.send({ files: [{ attachment: top, name: `top-${message.author.id}.png` }] });
    },
};