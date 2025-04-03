const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { flushLogs } = require('../../scripts/consoleLogger');
const { color, getTimestamp } = require('../../utils/loggingEffects');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flush-logs')
        .setDescription('Manually flush logs to Discord webhook (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        try {
            if (interaction.user.id !== client.config.developers) {
                return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, flags: MessageFlags.Ephemeral,});
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
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: `${client.config.errorEmoji} Failed to send logs: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};
