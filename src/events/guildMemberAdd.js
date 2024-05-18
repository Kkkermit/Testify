const { Events, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const Canvas = require("canvas"); 
const WelcomeMessage = require("../schemas/welcomeSystem"); 
const config = require('../config')

var welcomeCanvas = {};
welcomeCanvas.create = Canvas.createCanvas(1024, 500);
welcomeCanvas.context = welcomeCanvas.create.getContext("2d");
welcomeCanvas.context.font = "72px sans-serif";
welcomeCanvas.context.fillStyle = "#ffffff";

Canvas.loadImage(
    "https://i.postimg.cc/DwNqcd3K/Testi-9.png"
).then(async (img) => {
    welcomeCanvas.context.drawImage(img, 0, 0, 1024, 500);
    welcomeCanvas.context.fillText("Welcome", 360, 360);
    welcomeCanvas.context.beginPath();
    welcomeCanvas.context.arc(512, 166, 128, 0, Math.PI * 2, true);
    welcomeCanvas.context.stroke();
    welcomeCanvas.context.fill();
});

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        let canvas = welcomeCanvas;
        (canvas.context.font = "42px sans-serif"),
        (canvas.context.textAlign = "center");
        canvas.context.fillText(member.user.username.toUpperCase(), 512, 410);
        canvas.context.font = "32px sans-serif";
        canvas.context.fillText(`You are the ${member.guild.memberCount} member to join the server`,512,455);
        canvas.context.beginPath();
        canvas.context.arc(512, 166, 119, 0, Math.PI * 2, true);
        canvas.context.closePath();
        canvas.context.clip();

        await Canvas.loadImage(
            member.user.displayAvatarURL({ extension: "png", size: 1024 })
        ).then((img) => {
            canvas.context.drawImage(img, 393, 47, 238, 238);
        });

        let attachment = new AttachmentBuilder(
            canvas.create.toBuffer(),
            `welcome-${member.id}.png`
        );

        const welcomeMessage = await WelcomeMessage.findOne({
            guildId: member.guild.id,
        });
        if (welcomeMessage) {
            const channel = member.guild.channels.cache.get(welcomeMessage.channelId);
            const messageContent = welcomeMessage.message.replace( "{user}", member.user.toString() );
            
            if (welcomeMessage.isEmbed) {
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