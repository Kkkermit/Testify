const { EmbedBuilder, MessageFlags } = require('discord.js');
const GuildPrefixSettings = require('../../schemas/prefixEnableSystem.js');
const blacklistSchema = require('../../schemas/blacklistSystem');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');
const { checkMessageDmUsability } = require('../../utils/commandParams/dmCommandCheck.js');
const { checkMessageUnderDevelopment } = require('../../utils/commandParams/underDevelopmentCheck.js');
const { getMessagePrefix } = require('../../utils/getMessagePrefix.js');

module.exports = {
    name: "messageCreate",
    async execute(message, client) {

        if (message.author.bot || message.system || message.webhookId)
            return;

        const prefix = await getMessagePrefix(message, client);

        if (message.guild) {
            const guildPrefixSettings = await GuildPrefixSettings.findOne({ Guild: message.guild.id });
            if (!guildPrefixSettings || !guildPrefixSettings.Enabled) {
                if (message.content.startsWith(prefix)) {
                    const reply = await message.reply({ content: 'The prefix system is yet to be set-up for this guild.', flags: MessageFlags.Ephemeral });
                    setTimeout(async () => {
                        await reply.delete();
                    }, 2500);
                }
                return;
            }
        }

        if (!message.content.toLowerCase().startsWith(prefix)) {
            return;
        }

        const userData = await blacklistSchema.findOne({
            userId: message.author.id,
        });

        if (userData) {
            const embed = new EmbedBuilder()
            .setAuthor({ name: `Blacklist System` })
            .setTitle(`You are blacklisted from using ${client.user.username}`)
            .setDescription(`Reason: ${userData.reason}`)
            .setColor(client.config.embedColor)
            .setFooter({ text: `You are blacklisted from using this bot` })
            .setTimestamp();

            const reply = await message.reply({ embeds: [embed], withResponse: true });
            setTimeout(async () => {
                await reply.delete();
            }, 2500);
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);

        let cmd = args.shift().toLowerCase();
            if (cmd.length === 0) return;

        let command = client.pcommands.get(cmd);
        if (!command) command = client.pcommands.get(client.aliases.get(cmd));

        if (!command) {
            try{
                const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle(`${client.user.username} prefix system ${client.config.arrowEmoji}`)
                .setDescription(`> The command you tried **does not exist**. \n> To see **all** commands, use \`\`/help-manual\`\``)

                return message.reply({ embeds: [embed], flags: MessageFlags.Ephemeral});
            } catch (error) {
                client.logs.error(`[PREFIX_ERROR] Error sending 'cannot find prefix' embed.`, error);
            };
        };

        if (!checkMessageDmUsability(command, message)) return;
        
        if (!checkMessageUnderDevelopment(command, message)) return;

        if (command.args && !args.length) {
            return message.reply(`You **didn't** provide any \`\`arguments\`\`.`);
        }

        try {
            command.execute(message, client, args);
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [MESSAGE_CREATE] Error while executing command. \n${color.red}[${getTimestamp()}] [MESSAGE_CREATE] Please check you are using the correct execute method: "async execute(message, client, args)": \n${color.red}[${getTimestamp()}] [MESSAGE_CREATE] `, error);

            const errorEmbed = new EmbedBuilder()
            .setColor("Red")
            .setDescription(`There was an error while executing this command!\n\`\`\`${error}\`\`\``)

            await message.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral});
        }
    },
};
