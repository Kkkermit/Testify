const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('soundboard')
    .setDMPermission(false)
    .setDescription('Play a sound ')
    .addStringOption(option => option.setName('sound').setDescription('Your choice').setRequired(true)
        .addChoices(
            {name:'Bruh',value:'Bruh'},       
            {name:'Aw Shit',value:'awShit'}
        )
    ),
    async execute(interaction, client) {
        const sound = interaction.options.getString('sound');
        let audioURL;

        if (sound === 'Bruh') {
            audioURL = 'https://www.myinstants.com/media/sounds/movie_1_C2K5NH0.mp3';
        }  else if (sound === 'awShit') {
            audioURL = 'https://www.myinstants.com/media/sounds/gta-san-andreas-ah-shit-here-we-go-again.mp3';
        }   

        if (!interaction.member.voice.channel) {
            await interaction.reply({ content: 'You must be in a **voice channel** to use this command.', ephemeral:true});
        return;
        }

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator
        });

        const audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);
        const audioResource = createAudioResource(audioURL);
        audioPlayer.play(audioResource);

        const embedPlay = new EmbedBuilder()
        .setColor(client.config.embedMusic)
        .setAuthor({ name: `Soundboard Command ${client.config.devBy}`})
        .setTitle(`${client.user.username} Soundboard Command ${client.config.arrowEmoji}`)
        .setDescription(`> ${client.config.musicEmojiPlay} Playing your **sound effect**..`)
        .setFooter({ text: `Soundboard Command`})
        .setTimestamp()
        .setThumbnail(client.user.avatarURL());

        const message = await interaction.reply({ embeds: [embedPlay], fetchReply: true, ephemeral: true });

        audioPlayer.on('stateChange', (oldState, newState) => {

            if (newState.status === 'idle') {
                connection.destroy();

                const embedStop = new EmbedBuilder()
                .setColor(client.config.embedMusic)
                .setAuthor({ name: `Soundboard Command ${client.config.devBy}`})
                .setTitle(`${client.user.username} Soundboard Command ${client.config.arrowEmoji}`)
                .setDescription(`> ${client.config.musicEmojiPlay} Your **sound effect** finished playing`)
                .setFooter({ text: `Soundboard Command`})
                .setTimestamp()
                .setThumbnail(client.user.avatarURL());

                interaction.editReply({ embeds: [embedStop], ephemeral:true });
            }

        });

            audioPlayer.on('error', error => {
            client.logs.error(error);
            connection.destroy();

            message.edit({ content: `An **error** occurred whilst playing your **sound effect**!`});

        });
    },
};