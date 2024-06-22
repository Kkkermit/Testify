const { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } = require("discord.js");
const Canvas = require("canvas");
const filter = require("../../jsons/filter.json");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("pepe-sign")
    .setDescription("Creates a pepe sign emoji")
    .addStringOption(option => option.setName("text").setDescription("The text to put on the sign").setRequired(true)),
    async execute(interaction, client) {
        
        const canvas = Canvas.createCanvas(200, 200);
        const ctx = canvas.getContext("2d");
        const blankSign = await Canvas.loadImage("https://i.postimg.cc/28bjZ4GW/pepesign.png");
        
        const signText = interaction.options.getString("text").trim();

        if (filter.words.includes(signText)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

        const maxLineWidth = 60;
        let lines = [];
        let currentLine = "";
        const words = signText.split(" ");
        for (const word of words) {
            const testLine = currentLine.length === 0 ? word : `${currentLine} ${word}`;
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxLineWidth) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        lines.push(currentLine);
        const lineHeight = 30;
        const totalHeight = lines.length * lineHeight;
        const startY = (canvas.height - totalHeight) / 4;

        ctx.drawImage(blankSign, 0, 0, canvas.width, canvas.height);
        ctx.font = "30px Arial";
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            ctx.fillText(line, canvas.width / 2, y);
        });

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "pepesign.png" });

        const embed = new EmbedBuilder()
            .setColor(client.config.embedFun)
            .setTitle(`${client.user.username} Pepe Sign ${client.config.arrowEmoji}`)
            .setImage("attachment://pepesign.png")
            .setFooter({ text: `Pepe sign created ${client.config.devBy}`})
            .setTimestamp();

        interaction.reply({ content: `<@${interaction.user.id}>, here is your sign ${client.config.pepeCoffeeEmoji}`, embeds: [embed], files: [attachment] });
    }
}