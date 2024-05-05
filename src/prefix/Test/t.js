const { EmbedBuilder } = require("discord.js");
module.exports = {
  name: "test",
  aliases: ["t"],
  args: true,

  async execute(message, client, args) {
    const msg = args.join(" ");

    const embed = new EmbedBuilder()
      .setDescription(msg)
      .setColor("#00FFFB");

    message.reply({ embeds: [embed] });
  },
};
