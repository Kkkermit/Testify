const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const config = require('../../config')
const blacklistSchema = require("../../schemas/blacklistSystem");
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        const userData = await blacklistSchema.findOne({
            userId: interaction.user.id,
        });

        if (userData) {
            const embed = new EmbedBuilder()
            .setAuthor({ name: `Blacklist System` })
            .setTitle(`You are blacklisted from using ${client.user.username}`)
            .setDescription(`Reason: ${userData.reason}`)
            .setColor(client.config.embedColor)
            .setFooter({ text: `You are blacklisted from using this bot` })
            .setTimestamp();

            const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
            setTimeout(async () => {
                await reply.delete();
            }, 5000);

            return;
        }

        const command = client.commands.get(interaction.commandName);

        if (!command) return
        
        try{
            await command.execute(interaction, client);
        } catch (error) {

            console.error(`${color.red}[${getTimestamp()}] [INTERACTION_CREATE] Error while executing command. \n${color.red}[${getTimestamp()}] [INTERACTION_CREATE] Please check you are using the correct execute method: "async execute(interaction, client)": \n${color.red}[${getTimestamp()}] [INTERACTION_CREATE]`, error);

            const channelID = `${client.config.commandErrorChannel}`;
            if (!channelID) {
                console.error(`${color.red}[${getTimestamp()}] [INTERACTION_CREATE] No command error channel ID provided. Please provide a valid channel ID in the config.js file.`);
                return;
            }

            const channel = client.channels.cache.get(channelID);   

            const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTimestamp()
            .setAuthor({ name: `${client.user.username} Command Error ${config.devBy}`, iconURL: client.user.avatarURL()})
            .setFooter({ text: 'Error reported at' })
            .setTitle(`__Command Execution Error__ ${config.arrowEmoji}`)
            .setDescription('An error occurred while executing the command.')
            .addFields(
            { name: '> Command', value: `\`\`\`${interaction.commandName}\`\`\`` },
            { name: '> Triggered By', value: `\`\`\`${interaction.user.username}#${interaction.user.discriminator}\`\`\`` },
            { name: '> Guild', value: `\`\`\`${interaction.guild.name}\`\`\`` },
            { name: '> Error', value: `\`\`\`${error}\`\`\`` })
            
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

            const message = await channel.send({ embeds: [embed], components: [row] });   
            
            client.errorMessageInteraction = message;
            client.errorEmbedInteraction = embed;
            client.errorRowInteraction = row;

            const errorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setDescription(`There was an error while executing this command!\n\`\`\`${error}\`\`\``)

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true});
        }
    },
};