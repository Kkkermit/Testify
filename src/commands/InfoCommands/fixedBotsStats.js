const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, version } = require('discord.js');
const botStats = require('../../schemas/fixedBotsStatsSystem');
const os = require('os');
const { color, getTimestamp } = require('../../utils/loggingEffects.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('bot-stats-channel')
    .setDescription('Set the channel for the bot stats command.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(command => command.setName("set").setDescription("Set the channel for the bot stats command.").addChannelOption(option => option.setName("channel").setDescription("The channel to set the bot stats command to.").setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand(command => command.setName("remove").setDescription("Remove the channel for the bot stats command.")),
    async execute(interaction, client) {

        const { options } = interaction;
        const sub = options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        switch(sub) {
            case 'set':

            const channel = options.getChannel("channel");

            const channelAddData = await botStats.findOne({ User: interaction.guild.id });

            if (channelAddData) {
                await botStats.findOneAndDelete({ User: interaction.guild.id });
            }

            const embed = new EmbedBuilder()
            .setAuthor({ name: `Bot stats channel ${client.config.devBy}`})
            .setColor(client.config.embedInfo)
            .setTitle(`${client.user.username} bot stats channel set ${client.config.arrowEmoji}`)
            .setDescription(`The bot stats channel has been set to <#${channel.id}>.`)
            .setFooter({ text: "Bot stats channel set" });

            const cpus = os.cpus();
            const cpuModel = cpus[0].model;
            const cpuUsage = (process.cpuUsage().user / 1024 / 1024).toFixed(2);
            const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

            const statsEmbed = new EmbedBuilder()
            .setAuthor({ name: `Bot stats ${client.config.devBy}`})
            .setColor(client.config.embedInfo)
            .setTitle(`${client.user.username} Bot statistics ${client.config.arrowEmoji}`)
            .setDescription(`**Global Statistics**\nGuild Count - \`\`${client.guilds.cache.size}\`\`\nGlobal Users - \`\`${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)}\`\`\nTotal Commands - \`\`${client.commands.size + client.pcommands.size}\`\`\n\n**System Statistics**\nCPU - \`\`${cpuModel}\`\`\nCPU Usage - \`\`${cpuUsage}%\`\`\nRAM Usage - \`\`${ramUsage}MB\`\`\nNode.js Version - \`\`${process.version}\`\`\nDiscord.js Version - \`\`${version}\`\``)
            .setFooter({ text: `${client.user.username} - Bot statistics` })
            .setTimestamp()
            .setThumbnail(client.user.avatarURL());

            const message = await channel.send({ embeds: [statsEmbed] });

            const newData = new botStats({
                User: interaction.guild.id,
                Channel: channel.id,
                Guild: interaction.guild.id,
                MessageId: message.id
            });

            await interaction.reply({ embeds: [embed], ephemeral: true});
            

            newData.save();

            break;
            case 'remove':
            const channelRemoveData = await botStats.findOne({ User: interaction.guild.id });

            if (!channelRemoveData) {
                return await interaction.reply({ content: `Bot stats channel has not been set.`, ephemeral: true });
            }

            const removeChannel = client.channels.cache.get(channelRemoveData.Channel);
            if (!removeChannel) {
                return await interaction.reply({ content: `Channel not found.`, ephemeral: true });
            }

            try {
                const message = await removeChannel.messages.fetch(channelRemoveData.MessageId);
                if (message) {
                    await message.delete();
                }
            } catch (error) {
                console.error(`${color.red}[${getTimestamp()}] [BOT_STATS] Failed to delete message. \n${color.red}[${getTimestamp()}] [BOT_STATS]`, error);
            }

            await botStats.findOneAndDelete({ User: interaction.guild.id });

            await interaction.reply({ content: `Bot stats channel has been removed and the message deleted.`, ephemeral: true });
        }
    }
}
