const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { flushLogs } = require('../../scripts/consoleLogger');
const { color, getTimestamp } = require('../../utils/loggingEffects');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flush-logs')
        .setDescription('Manually flush logs to Discord webhook (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        try {
            if (!client.config.developers.includes(interaction.user.id)) {
                return interaction.reply({ 
                    content: `${client.config.ownerOnlyCommand}`,
                    ephemeral: true 
                });
            }

            await interaction.deferReply();
            
            console.log(`${color.blue}[${getTimestamp()}] [LOGS] Manually flushing logs to Discord${color.reset}`);
            
            flushLogs(true);
            
            const embed = new EmbedBuilder()
                .setAuthor({ name: `Flush Logs Command ${client.config.devBy}` })
                .setTitle(`${client.user.username} Flush logs ${client.config.arrowEmoji}`)
                .setColor(client.config.embedDev)
                .setDescription(`${client.config.countSuccessEmoji} Logs have been successfully sent to the Discord webhook.`)
                .setTimestamp()
                .setFooter({ text: `${client.user.username} | ${client.config.botVersion}` });
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [LOGS] Error flushing logs: ${error}${color.reset}`);
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `${client.config.errorEmoji} Failed to send logs: ${error.message}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `${client.config.errorEmoji} Failed to send logs: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }
};
