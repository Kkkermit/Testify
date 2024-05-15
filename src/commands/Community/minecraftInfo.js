const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('minecraft')
    .setDescription('Get info about a Minecraft user or server.')
    .addSubcommand(command => command.setName('skin').setDescription('Get a users minecraft skin!').addStringOption(option => option.setName('username').setDescription('Minecraft username').setRequired(true)))
    .addSubcommand(command => command.setName('server').setDescription('Get info about a Minecraft server!').addStringOption(option => option.setName('ip').setDescription('Minecraft server IP').setRequired(true))),
    async execute(interaction, client) {
    
        const sub = interaction.options.getSubcommand();

        switch(sub) {
            case 'skin':
            
                const username = interaction.options.getString('username');

                const embed = new EmbedBuilder()
                .setAuthor({ name: `MineCraft Skin Command ${client.config.devBy}`})
                .setTitle(`${client.user.username} Minecraft Skin Tracker ${client.config.arrowEmoji}`)
                .setDescription(`> **${username}'s** Minecraft Skin:`)
                .setImage(`https://minotar.net/body/${username}/100.png`)
                .setColor(client.config.embedCommunity)
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: `${interaction.user.avatarURL()}` })
                .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            
            break;
            case 'server':

                interaction.deferReply()

                const ip = interaction.options.getString(`ip`);
            
                const url = `https://api.mcsrvstat.us/1/${ip}`;
    
                try {
                    const data = await fetch(url).then((response) => response.json());
                    const serverIp = data.hostname;
                    const realIp = data.ip;
                    const port = data.port;
                    const version = data.version;
                    const onlinePlayers = data.players.online;
                    const maxPlayers = data.players.max;
                    const motd = data.motd.clean     
                    
                    const embed = new EmbedBuilder()
                    .setColor(client.config.embedCommunity)
                    .setAuthor({ name: `MineCraft Server Command ${client.config.devBy}`, iconURL: `${client.user.avatarURL()}`})
                    .setTitle(`${client.user.username} Minecraft Server Tool ${client.config.arrowEmoji}`)
                    .setThumbnail(client.user.avatarURL())
                    .addFields(
                        { name: "Server", value:`> ${serverIp}` },
                        { name: "IP Address", value: `> ${realIp}`, inline: true},
                        { name: "Port", value: `> ${port}`, inline: true},
                        { name: "Version", value: `> ${version.toString()}` },
                        { name: "MOTD", value: `> ${motd.toString()}`}, 
                        { name: "Online Players", value: `> ${onlinePlayers.toString()}`, inline: true},
                        { name: "Max Players", value: `> ${maxPlayers.toString()}`, inline: true})
                    .setFooter({ text: "Server Status Displayed" })
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [embed]});
                } catch (error) {
                    interaction.editReply({content: `Server **does not exist** or **cannot be reached**. One command issue can be the **incorrect IP address**. Double check your IP and try again!`, ephemeral: true});
            }
        }
    }
};