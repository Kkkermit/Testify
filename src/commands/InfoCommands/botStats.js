const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription(`Displays the bot's current uptime.`)
        .addSubcommand(command => command.setName('uptime').setDescription(`Displays the bot's current uptime.`))
        .addSubcommand(command => command.setName('specs').setDescription('Displays the specs of the bot.')),
    
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();

        switch(sub) {
            case 'uptime':

                const getUptime = () => {
                    let totalSeconds = (client.uptime / 1000);
                    let days = Math.floor(totalSeconds / 86400);
                    totalSeconds %= 86400;
                    let hours = Math.floor(totalSeconds / 3600);
                    totalSeconds %= 3600;
                    let minutes = Math.floor(totalSeconds / 60);
                    let seconds = Math.floor(totalSeconds % 60);
                    return `**${days}**d **${hours}**h **${minutes}**m **${seconds}**s`;
                }

                let uptime = getUptime();

                const uptimeEmbed = new EmbedBuilder()
                    .setAuthor({ name: `${client.user.username} uptime ${client.config.devBy}`})
                    .setColor(client.config.embedInfo)
                    .setTitle('⏳ **Current Uptime**')
                    .addFields({ name: "Uptime", value: `> ${uptime}` })
                    .setThumbnail(client.user.avatarURL())
                    .setFooter({ text: `Uptime command` })
                    .setTimestamp()

                const reloadButton = new ButtonBuilder()
                    .setCustomId('reload_uptime')
                    .setLabel('Reload')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder().addComponents(reloadButton);

                await interaction.reply({ embeds: [uptimeEmbed], components: [row] });

                const filter = (i) => i.customId === 'reload_uptime' && i.user.id === interaction.user.id;

                const collector = interaction.channel.createMessageComponentCollector({ filter });

                collector.on('collect', async i => {
                    if (i.customId === 'reload_uptime') {
                        let newUptime = getUptime();

                        const updatedEmbed = new EmbedBuilder()
                            .setAuthor({ name: `${client.user.username} uptime ${client.config.devBy}`})
                            .setColor(client.config.embedInfo)
                            .setTitle('⏳ **Current Uptime**')
                            .addFields({ name: "Uptime", value: `> ${newUptime}` })
                            .setThumbnail(client.user.avatarURL())
                            .setFooter({ text: `Uptime command` })
                            .setTimestamp()

                        await i.update({ embeds: [updatedEmbed], components: [row] });
                    }
                });

                break;

            case 'specs':
                const usage2 = process.memoryUsage();
                const usage = process.cpuUsage();
                const usagePercent = usage.system / usage.user * 100;
                const usagePercent2 = usage2.system / usage2.user * 100;
                const memoryUsed = (os.totalmem - os.freemem) / 1000000000;
                const memoryTotal = os.totalmem() / 1000000000;

                const specsEmbed = new EmbedBuilder()
                    .setTitle('💻 **Bot Specs**')
                    .setThumbnail(client.user.avatarURL())
                    .setAuthor({ name: `${client.user.username} bot specs command ${client.config.devBy}`})
                    .setColor(client.config.embedInfo)
                    .setFooter({ text: `Specs command` })
                    .addFields({ name: `Memory:`, value: `> ${(memoryUsed / memoryTotal * 100).toFixed(1)}%` })
                    .addFields({ name: 'OS:', value: `> ${os.type()}` })
                    .addFields({ name: `OS Version:`, value: `> ${os.release()}` })
                    .addFields({ name: 'CPU: ', value: `> ${usagePercent.toFixed(1)}%`, inline: true })
                    .addFields({ name: 'CPU Type (Arch): ', value: `> ${os.arch()}`, inline: true })
                    .setTimestamp();

                await interaction.reply({ embeds: [specsEmbed] });
        }
    }
};
