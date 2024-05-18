const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("slow-mode")
    .setDescription("Set, disable, or check slowmode")
    .addSubcommand(subcommand => subcommand.setName("set").setDescription("Set slowmode in the channel").addIntegerOption(option => option.setName("duration").setDescription("Duration of the slowmode in seconds").setRequired(true)).addChannelOption(option => option.setName("channel").setDescription("Channel to set slowmode in").setRequired(false)))
    .addSubcommand(subcommand => subcommand.setName("off").setDescription("Disable slowmode in the channel").addChannelOption(option => option.setName("channel").setDescription("Channel to disable slowmode in").setRequired(false)))
    .addSubcommand(subcommand => subcommand.setName("check").setDescription("Check slowmode status in the channel").addChannelOption(option => option.setName("channel").setDescription("Channel to check slowmode in").setRequired(false))),
    async execute(interaction, client) {
    
        const channel = interaction.options.getChannel("channel") || interaction.channel;

        if (interaction.options.getSubcommand() === "set") {
            const duration = interaction.options.getInteger("duration");

            if (duration < 0 || duration > 21600) {
                return await interaction.reply({ content: "Slowmode duration must be between 0 and 21600 seconds.", ephemeral: true });
            }

      try {
        await channel.setRateLimitPerUser(duration);
        await interaction.reply({
          content: `Slowmode set to ${duration} seconds in ${channel.name}.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error("Failed to set slowmode:", error);
        await interaction.reply({
          content: "Failed to set slowmode in this channel.",
          ephemeral: true,
        });
      }
    } else if (interaction.options.getSubcommand() === "off") {
      try {
        await channel.setRateLimitPerUser(0);
        await interaction.reply({
          content: `Slowmode disabled in ${channel.name}.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error("Failed to disable slowmode:", error);
        await interaction.reply({
          content: "Failed to disable slowmode in this channel.",
          ephemeral: true,
        });
      }
    } else if (interaction.options.getSubcommand() === "check") {
      try {
        await channel.fetch();

        const slowmode = channel.rateLimitPerUser;

        if (slowmode === 0) {
          await interaction.reply({
            content: `Slowmode is not enabled in ${channel.name}.`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `Slowmode is set to ${slowmode} seconds in ${channel.name}.`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error("Failed to check slowmode:", error);
        await interaction.reply({
          content: "Failed to check slowmode status in this channel.",
          ephemeral: true,
        });
      }
    }
  },
};
