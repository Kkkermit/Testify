const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const GuildSettings = require('../../schemas/prefixSystem');
const blacklistSchema = require('../../schemas/blacklistSystem');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    name: "messageCreate",
    async execute(message, client) {

        if (
            message.author.bot || !message.guild || message.system || message.webhookId
        )
            return;

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
    
                const reply = await message.reply({ embeds: [embed], fetchReply: true });
                setTimeout(async () => {
                    await reply.delete();
                }, 5000);
    
                return;
            }

        const guildSettings = await GuildSettings.findOneAndUpdate(
            { Guild: message.guild.id }, 
            { $setOnInsert: { Prefix: client.config.prefix } }, 
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        const prefix = guildSettings.Prefix || client.config.prefix;

        if (!message.content.startsWith(prefix)) {
            return;
        }

        if (!message.content.startsWith(prefix)) return;
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

                return message.reply({ embeds: [embed], ephemeral: true});
            } catch (error) {
                client.logs.error(`[PREFIX_ERROR] Error sending 'cannot find prefix' embed.`, error);
            };
        };

        if (!command) return;

        if (command.args && !args.length) {
            return message.reply(`You **didn't** provide any \`\`arguments\`\`.`);
        }

        try {
            command.execute(message, client, args);
        } catch (error) {
            console.error(`${color.red}[${getTimestamp()}] [MESSAGE_CREATE] Error while executing command. \n${color.red}[${getTimestamp()}] [MESSAGE_CREATE] Please check you are using the correct execute method: "async execute(message, client, args)":`, error);

            const channelID = `${client.config.commandErrorChannel}`;
            const channel = client.channels.cache.get(channelID);   

            const errorEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTimestamp()
            .setAuthor({ name: `${client.user.username} Command Error ${config.devBy}`, iconURL: client.user.avatarURL()})
            .setFooter({ text: 'Error reported at' })
            .setTitle(`__Prefix Command Execution Error__ ${config.arrowEmoji}`)
            .setDescription('An error occurred while executing the prefix command.')
            .addFields(
            { name: '> Command', value: `\`\`\`${message.command}\`\`\`` },
            { name: '> Triggered By', value: `\`\`\`${message.author.username}#${message.author.discriminator}\`\`\`` },
            { name: '> Guild', value: `\`\`\`${message.guild.name}\`\`\`` },
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
            
            client.on('messageCreate', async (message) => {
                try {
                    if (!message.isButton()) return;
                    if (message.message.id !== message.id) return;
                    
                    const { customId } = message;

                    if (customId === 'change_color_yellow') {
                        embed.setColor('#FFFF00');
                        await message.channel.send({
                        content: 'This error has been marked as pending.',
                        ephemeral: true,
                        });
                    } else if (customId === 'change_color_green') {
                        embed.setColor('#00FF00');
                        await message.channel.send({
                        content: 'This error has been marked as solved.',
                        ephemeral: true,
                        });
                    } else if (customId === 'change_color_red') {
                        embed.setColor('#FF0000');
                        await message.channel.send({
                        content: 'This error has been marked as unsolved.',
                        ephemeral: true,
                        });
                    }
                    await message.edit({ embeds: [embed], components: [row] });
                    await message.deferUpdate();
                } catch (error) {
                    client.logs.error('[ERROR_LOGGING] Error in button interaction:', error);
                }
            });

            const message = await channel.send({ embeds: [errorEmbed], components: [row] });       

            const embed = new EmbedBuilder()
            .setColor("Red")
            .setDescription(`There was an error while executing this command!\n\`\`\`${error}\`\`\``)

            await message.reply({ embeds: [embed], ephemeral: true});
        }
    },
};
