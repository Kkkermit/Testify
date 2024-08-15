const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'evalModal') {
                const code = interaction.fields.getTextInputValue('codeInput');
                const ephemeralInput = interaction.fields.getTextInputValue('ephemeralInput');
                const ephemeralChoice = ephemeralInput.toLowerCase() === 'true';

                const color = {
                    red: '\x1b[31m',
                    orange: '\x1b[38;5;202m',
                    yellow: '\x1b[33m',
                    green: '\x1b[32m',
                    blue: '\x1b[34m',
                    pink: '\x1b[38;5;213m',
                    torquise: '\x1b[38;5;45m',
                    purple: '\x1b[38;5;57m',
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
                };

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

                    const channel = await client.channels.cache.get(client.config.evalLogsChannel);

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