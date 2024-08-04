const { Interaction, EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("discord.js");
const config = require('../../config')

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        const color = {
            red: '\x1b[31m',
            orange: '\x1b[38;5;202m',
            yellow: '\x1b[33m',
            green: '\x1b[32m',
            blue: '\x1b[34m',
            reset: '\x1b[0m'
        }

        function getTimestamp() {
            const date = new Date();
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const seconds = date.getSeconds();
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

        if (!command) return
        
        try{
            await command.execute(interaction, client);
        } catch (error) {

            console.error(`${color.red}[${getTimestamp()}] [INTERACTION_CREATE] Error while executing command. \n${color.red}[${getTimestamp()}] [INTERACTION_CREATE] Please check you are using the correct execute method: "async execute(interaction, client)":`, error);

            const channelID = `${client.config.commandErrorChannel}`;
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
                .setCustomId('change_color_yellow')
                .setLabel('Mark As Pending')
                .setStyle('1');
            
            const greenButton = new ButtonBuilder()
                .setCustomId('change_color_green')
                .setLabel('Mark As Solved')
                .setStyle('3');
            
            const redButton = new ButtonBuilder()
                .setCustomId('change_color_red')
                .setLabel('Mark As Unsolved')
                .setStyle('4');
            
            const row = new ActionRowBuilder()
                .addComponents(yellowButton, greenButton, redButton);
            
            client.on('interactionCreate', async (interaction) => {
                try {
                    if (!interaction.isButton()) return;
                    if (interaction.message.id !== message.id) return;
                    
                    const { customId } = interaction;

                    if (customId === 'change_color_yellow') {
                        embed.setColor('#FFFF00');
                        await interaction.reply({
                        content: 'This error has been marked as pending.',
                        ephemeral: true,
                        });
                    } else if (customId === 'change_color_green') {
                        embed.setColor('#00FF00');
                        await interaction.reply({
                        content: 'This error has been marked as solved.',
                        ephemeral: true,
                        });
                    } else if (customId === 'change_color_red') {
                        embed.setColor('#FF0000');
                        await interaction.reply({
                        content: 'This error has been marked as unsolved.',
                        ephemeral: true,
                        });
                    }
                    await message.edit({ embeds: [embed], components: [row] });
                    await interaction.deferUpdate();
                } catch (error) {
                    client.logs.error('[ERROR_LOGGING] Error in button interaction:', error);
                }
            });

            const message = await channel.send({ embeds: [embed], components: [row] });        

            const errorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setDescription(`There was an error while executing this command!\n\`\`\`${error}\`\`\``)

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true});
        }
    },
};