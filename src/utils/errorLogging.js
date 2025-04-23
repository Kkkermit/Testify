const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { color, getTimestamp } = require('./loggingEffects.js');

async function logCommandError(error, interaction, client) {
    const channelID = client.config.commandErrorChannel;
    if (!channelID) {
        console.error(`${color.red}[${getTimestamp()}] [ERROR_LOGGING] No command error channel ID provided. Please provide a valid channel ID in the config.js file.`);
        return false;
    }

    const channel = client.channels.cache.get(channelID);
    if (!channel) {
        console.error(`${color.red}[${getTimestamp()}] [ERROR_LOGGING] Error channel with ID ${channelID} not found.`);
        return false;
    }

    const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTimestamp()
        .setAuthor({ 
            name: `${client.user.username} Command Error ${client.config.devBy}`, 
            iconURL: client.user.avatarURL()
        })
        .setFooter({ text: 'Error reported at' })
        .setTitle(`__Command Execution Error__ ${client.config.arrowEmoji}`)
        .setDescription('An error occurred while executing the command.')
        .addFields(
            { name: '> Command', value: `\`\`\`${interaction.commandName}\`\`\`` },
            { name: '> Triggered By', value: `\`\`\`${interaction.user.username}\`\`\`` },
            { name: '> Guild', value: `\`\`\`${interaction.guild ? interaction.guild.name : 'DM Channel'}\`\`\`` },
            { name: '> Error', value: `\`\`\`${error.toString().slice(0, 1000)}\`\`\`` }
        );
    
    const yellowButton = new ButtonBuilder()
        .setCustomId('change_color_yellow_slash')
        .setLabel('Mark As Pending')
        .setStyle('1');
    
    const greenButton = new ButtonBuilder()
        .setCustomId('change_color_green_slash')
        .setLabel('Mark As Solved')
        .setStyle('3');
    
    const redButton = new ButtonBuilder()
        .setCustomId('change_color_red_slash')
        .setLabel('Mark As Unsolved')
        .setStyle('4');
    
    const row = new ActionRowBuilder()
        .addComponents(yellowButton, greenButton, redButton);

    try {
        const message = await channel.send({ embeds: [embed], components: [row] });
        
        client.errorMessageInteraction = message;
        client.errorEmbedInteraction = embed;
        client.errorRowInteraction = row;
        
        console.log(`${color.green}[${getTimestamp()}] [ERROR_LOGGING] Error logged successfully in channel ${channelID}`);
        return true;
    } catch (channelError) {
        console.error(`${color.red}[${getTimestamp()}] [ERROR_LOGGING] Failed to send error message to channel:`, channelError);
        return false;
    }
}

module.exports = { logCommandError };
