const { Events, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'evalModal') {
                const code = interaction.fields.getTextInputValue('codeInput');
                const ephemeralInput = interaction.fields.getTextInputValue('ephemeralInput');
                const ephemeralChoice = ephemeralInput.toLowerCase() === 'true';

                if (interaction.user.id !== client.config.developers) {
                    return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, flags: MessageFlags.Ephemeral,});
                }

                const sensitivePatterns = [
                    /process\.env\.token/i,
                    /client\.token/i,
                    /process\.env\.mongodb/i,
                    /mongodb:\/\//i,
                    /mongo_uri/i,
                    /mongodburi/i
                ];
                
                let hasSensitiveInfo = false;
                let detectedPattern = '';
                
                for (const pattern of sensitivePatterns) {
                    if (pattern.test(code)) {
                        hasSensitiveInfo = true;
                        detectedPattern = pattern.toString();
                        break;
                    }
                }
                
                if (hasSensitiveInfo) {
                    const warningEmbed = new EmbedBuilder()
                        .setTitle('⚠️ Security Warning')
                        .setDescription('You are attempting to access sensitive information that could potentially expose your bot\'s security credentials.')
                        .addFields(
                            { name: 'Detected Sensitive Pattern', value: `\`${detectedPattern}\`` },
                            { name: 'Security Risk', value: 'Exposing tokens or connection strings can lead to unauthorized access to your bot and databases.' },
                            { name: 'Options', value: 'Click "Continue" to proceed with execution anyway, or "Cancel" to abort.' }
                        )
                        .setColor('#FF0000')
                        .setTimestamp()
                        .setFooter({ text: 'Security Protection', iconURL: client.user.avatarURL() });

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('eval_continue')
                                .setLabel('Continue')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId('eval_cancel')
                                .setLabel('Cancel')
                                .setStyle(ButtonStyle.Secondary)
                        );
                    
                    const response = await interaction.reply({ 
                        embeds: [warningEmbed], 
                        components: [row], 
                        flags: MessageFlags.Ephemeral,
                        fetchReply: true
                    });

                    const collector = response.createMessageComponentCollector({ 
                        time: 30000,
                        max: 1
                    });

                    collector.on('collect', async i => {
                        if (i.user.id !== interaction.user.id) {
                            return i.reply({ 
                                content: 'Only the command user can interact with these buttons.', 
                                flags: MessageFlags.Ephemeral 
                            });
                        }
                        
                        if (i.customId === 'eval_cancel') {
                            await i.update({ 
                                content: 'Eval command cancelled.', 
                                embeds: [], 
                                components: [] 
                            });
                            return;
                        }

                        if (i.customId === 'eval_continue') {
                            await i.update({ 
                                content: 'Proceeding with evaluation...', 
                                embeds: [], 
                                components: [] 
                            });

                            await processEvaluation(code, ephemeralChoice, interaction, client);
                        }
                    });

                    collector.on('end', async collected => {
                        if (collected.size === 0) {
                            await interaction.editReply({
                                content: 'Eval command timed out. Please try again.',
                                embeds: [],
                                components: []
                            });
                        }
                    });
                    
                    return;
                }

                await processEvaluation(code, ephemeralChoice, interaction, client);
            }
        }
    }
}

async function processEvaluation(code, ephemeralChoice, interaction, client) {
    try {
        let evaled;
        const logOutput = [];
        const originalLog = console.log;
        const logFilePath = path.join(__dirname, '../../logs/evalLogs.txt');
        const timestamp = getTimestamp();

        fs.appendFileSync(logFilePath, `[${timestamp}] [EVAL_COMMAND_INPUT] Eval command input: ${code}\n`);

        console.log = function(...args) {
            const customContent = `${color.purple}[${timestamp}]${color.reset} [EVAL_COMMAND_LOG] Eval command has logged:`;
            const modifiedArgs = args.map(arg => `${customContent} ${arg}`);

            originalLog.apply(console, modifiedArgs);
            logOutput.push(...args);
        };

        if (code.includes('await')) {
            evaled = await eval(`(async () => { return ${code}; })()`);
        } else {
            evaled = eval(code);
        }

        console.log = originalLog;

        if (typeof evaled !== 'string') {
            evaled = require('util').inspect(evaled);
        }

        if (logOutput.length > 0) {
            evaled = logOutput.join('\n') + (evaled !== 'undefined' ? `\n${evaled}` : '');
        } else if (evaled === 'undefined') {
            evaled = 'undefined';
        }

        const channelID = client.config.evalLogsChannel;
        if (!channelID) {
            console.error(`No eval logs channel ID provided. Please provide a valid channel ID in the config.js file.`);
            return;
        }

        const channel = await client.channels.cache.get(channelID);

        const originalSend = channel.send;

        channel.send = function(content, options = {}) {
            options.ephemeral = false;
            return originalSend.call(this, content, options);
        };

        const embed = new EmbedBuilder()
            .setAuthor({ name: `Eval Code ${client.config.devBy}`, iconURL: client.user.avatarURL() })
            .setTitle(`${client.user.username} Evaluated JavaScript Code ${client.config.arrowEmoji}`)
            .setDescription(`__Code has been executed successfully!__`)
            .addFields(
                { name: '📥 Input', value: `\`\`\`js\n${code}\n\`\`\`` },
                { name: '📤 Output', value: `\`\`\`js\n${evaled}\n\`\`\`` }
            )
            .setColor(client.config.embedDev)
            .setTimestamp()
            .setFooter({ text: `Executed By ${interaction.user.username}`, iconURL: interaction.user.avatarURL() });

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed], ephemeral: ephemeralChoice });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: ephemeralChoice });
        }
        
        await channel.send({ embeds: [embed] });
        fs.appendFileSync(logFilePath, `[${timestamp}] [EVAL_COMMAND_OUTPUT] Eval command output: ${evaled}\n`);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ content: `\`\`\`js\n${error}\n\`\`\``, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: `\`\`\`js\n${error}\n\`\`\``, flags: MessageFlags.Ephemeral });
        }
    }
}