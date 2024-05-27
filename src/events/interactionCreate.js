const { Interaction, EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return
        
        try{
            await command.execute(interaction, client);
        } catch (error) {

            client.logs.error(error);

            const channelID = `${client.config.commandErrorChannel}`;
            const channel = client.channels.cache.get(channelID);   
        

            const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTimestamp()
            .setAuthor({ name: `${client.user.username} Command Error`, iconURL: client.user.avatarURL()})
            .setFooter({ text: 'Error Reported At' })
            .setTitle('Command Execution Error')
            .setDescription('An error occurred while executing the command.')
            .addFields(
            { name: '> •   Command', value: `\`\`\`${interaction.commandName}\`\`\`` },
            { name: '> •   Triggered By', value: `\`\`\`${interaction.user.username}#${interaction.user.discriminator}\`\`\`` },
            { name: '> •   Error Stack', value: `\`\`\`${error.stack}\`\`\`` },
            { name: '> •   Error Message', value: `\`\`\`${error.message}\`\`\`` });
            
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