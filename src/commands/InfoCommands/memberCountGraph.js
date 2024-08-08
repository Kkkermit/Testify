const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const QuickChart = require('quickchart-js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('member-count')
    .setDescription('Shows the number of members on the server.')
    .addStringOption(option => option.setName('chart-type').setDescription('Type of chart to display').setRequired(true).addChoices(
        { name: "bar", value: "bar" },
        { name: "pie", value: "pie" },
    )),
    async execute(interaction, client) {

        const chartType = interaction.options.getString('chart-type');
        const guild = interaction.guild;
        const totalMembers = guild.memberCount;
        const botMembers = guild.members.cache.filter(member => member.user.bot).size;
        const humanMembers = totalMembers - botMembers;
        const last24Hours = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 24 * 60 * 60 * 1000).size;
        const last7Days = guild.members.cache.filter(member => Date.now() - member.joinedTimestamp < 7 * 24 * 60 * 60 * 1000).size;

        const chart = new QuickChart();
        chart
            .setConfig({
                type: `${chartType}`,
                data: {
                    labels: ['Total', 'Members', 'Bots', '24h', '7 days'],
                    datasets: [{
                        label: 'Member Count',
                        data: [totalMembers, humanMembers, botMembers, last24Hours, last7Days],
                        backgroundColor: ['#36a2eb', '#ffce56', '#ff6384', '#cc65fe', '#66ff99']
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Server: ${guild.name}`
                        }
                    }
                }, 
            })

            .setWidth(500)
            .setHeight(300)
            .setBackgroundColor('#151515');

        const chartUrl = await chart.getShortUrl();

        const embed = new EmbedBuilder()
        .setAuthor({ name: `Member Graph`, iconURL: guild.iconURL({ size: 1024 })})
        .setTitle(`Member Count for ${guild.name} ${client.config.arrowEmoji}`)
        .setColor(client.config.embedInfo)
        .setDescription(`Total: **${totalMembers}**\nMembers: **${humanMembers}**\nBots: **${botMembers}**\nLast 24h: **${last24Hours}**\nLast 7 days: **${last7Days}**`)
        .setImage(chartUrl)
        .setFooter({ text: `Member count ${client.config.devBy}` })
        .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};