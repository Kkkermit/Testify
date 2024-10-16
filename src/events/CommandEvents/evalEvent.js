const { Events, EmbedBuilder } = require('discord.js');
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
                    return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, ephemeral: true,});
                }

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
                        console.logs.error(`No eval logs channel ID provided. Please provide a valid channel ID in the config.js file.`);
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

                    await interaction.reply({ embeds: [embed], ephemeral: ephemeralChoice });
                    await channel.send({ embeds: [embed] });
                    fs.appendFileSync(logFilePath, `[${timestamp}] [EVAL_COMMAND_OUTPUT] Eval command output: ${evaled}\n`);
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: `\`\`\`js\n${error}\n\`\`\``, ephemeral: true });
                }
            }
        }
    }
}