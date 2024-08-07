const { Events, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas"); 
const WelcomeMessage = require("../../schemas/welcomeSystem"); 
const config = require('../../config')

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {

        if (member.guild === null) return;
        const guildData = await WelcomeMessage.findOne({ guildId: member.guild.id });

        if (!guildData) return;

            const canvas = Canvas.createCanvas(1024, 500);
            const context = canvas.getContext("2d");
            context.font = "72px sans-serif";
            context.fillStyle = "#ffffff";

            const img = await Canvas.loadImage("https://i.postimg.cc/DwNqcd3K/Testi-9.png");
            context.drawImage(img, 0, 0, 1024, 500);
            context.fillText("Welcome", 360, 360);
            context.beginPath();
            context.arc(512, 166, 128, 0, Math.PI * 2, true);
            context.stroke();
            context.fill();

            canvas.context.font = "42px sans-serif",
            canvas.context.textAlign = "center";
            canvas.context.fillText(member.user.username.toUpperCase(), 512, 410);

            canvas.context.font = "32px sans-serif";
            canvas.context.fillText(`You are the ${addSuffix(member.guild.memberCount)} member to join the server`,512,455);
            canvas.context.beginPath();
            canvas.context.arc(512, 166, 119, 0, Math.PI * 2, true);
            canvas.context.closePath();
            canvas.context.clip();

            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: "png", size: 1024 }));
            context.beginPath();
            context.arc(512, 166, 128, 0, Math.PI * 2, true);
            context.closePath();
            context.clip();
            context.drawImage(avatar, 384, 38, 256, 256);

            let attachment = new AttachmentBuilder(
                canvas.toBuffer(),
                `welcome-${member.id}.png`
            );

            if (guildData) {
                const channel = member.guild.channels.cache.get(guildData.channelId);
                const messageContent = guildData.message.replace( "{user}", member.user.toString() );
                
                if (guildData.isEmbed) {
                    const embed = new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setDescription(messageContent)
                    .setThumbnail(`attachment://${attachment.filename}`);

                    channel.send({ embeds: [embed], files: [attachment] }); 
                } else {
                    channel.send({ content: messageContent, files: [attachment] });
                }
            }
    },
};

function addSuffix(number) {
    if (number % 100 >= 11 && number % 100 <= 13)
    return number + "th";

    switch (number % 10) {
        case 1: return number + "st";
        case 2: return number + "nd";
        case 3: return number + "rd";
    }
    return number + "th";
}
