const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Complete music system.")
    .addSubcommand(subcommand => subcommand.setName("play").setDescription("Play a song.").addStringOption(option => option.setName("query").setDescription("Provide the name of the url for the song.").setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName("volume").setDescription("Adjust the song volume.").addNumberOption(option => option.setName("percent").setDescription("10 = 10%").setMinValue(1).setMaxValue(100).setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName("options").setDescription("Select an option.").addStringOption(option => option.setName("options").setDescription("Select an option.").setRequired(true)
        .addChoices(
                {name: "queue", value: "queue"},
                {name: "skip", value: "skip"},
                {name: "pause", value: "pause"},
                {name: "resume", value: "resume"},
                {name: "stop", value: "stop"},
                {name: "shuffle", value: "shuffle"},
                {name: "repeat", value: "repeat"}))), 
    async execute(interaction, client) {

        const {options, member, guild, channel} = interaction;

        const subcommand = options.getSubcommand();
        const query = options.getString("query");
        const volume = options.getNumber("percent");
        const option = options.getString("options");
        const voiceChannel = member.voice.channel;

        const embed = new EmbedBuilder();

        if (!voiceChannel) {
            embed.setColor(client.config.embedMusic).setDescription("You **must** be in a voice channel to use the music system.");
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!member.voice.channelId == guild.members.me.voice.channelId) {
            embed.setColor(client.config.embedMusic).setDescription(`You **can't** use the music system as its already active in <#${guild.members.me.voice.channelId}>`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            switch (subcommand) {
                case "play":
                    client.distube.play(voiceChannel, query, {textChannel: channel, member: member});
                    return interaction.reply ({ content: "🎶 Request received."});
                case "volume":
                    client.distube.setVolume(voiceChannel, volume);
                    return interaction.reply ({ content: `🔊 Volume has been set to ${volume}%.`});
                case "options":
                    const queue = await client.distube.getQueue(voiceChannel);

                    if(!queue) {
                        embed.setColor("Red").setDescription("There is no active queue.");
                        return interaction.reply({ embeds: [embed], ephemeral: true});
                    }

                    switch(option) {
                        case "skip":
                            await queue.skip(voiceChannel);
                            embed.setColor(client.config.embedMusic).setDescription("⏩ The song has been skipped");
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                        case "stop":
                            await queue.stop(voiceChannel);
                            embed.setColor(client.config.embedMusic).setDescription("🛑 The queue has been stopped");
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                        case "pause":
                            await queue.pause(voiceChannel);
                            embed.setColor(client.config.embedMusic).setDescription("⏸️ The song(s) has been paused");
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                        case "resume":
                            await queue.resume(voiceChannel);
                            embed.setColor(client.config.embedMusic).setDescription("▶️ The song(s) has been resumed");
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                        case "queue":
                            await queue.pause(voiceChannel);
                            embed.setColor(client.config.embedMusic).setDescription(`${queue.songs.map(
                                (song, id) => `\n**${id + 1}.** ${song.name} -\` ${song.formattedDuration} \``
                            )}`);
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                        case "shuffle":
                            await queue.shuffle(voiceChannel);
                            embed.setColor(client.config.embedMusic).setDescription("🔀 The queue has been shuffled");
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                        case "repeat":
                            await queue.RepeatMode(voiceChannel, 1);
                            embed.setColor(client.config.embedMusic).setDescription("🔁 The queue has been set to repeat");
                            return interaction.reply({ embeds: [embed], ephemeral: true});
                    }
            }
        }catch(err) {
            console.log(err);

            embed.setColor(client.config.embedMusic).setDescription("❌ | Something went wrong...");

            return interaction.reply({ embeds: [embed], ephemeral: true});
        }
    }
}