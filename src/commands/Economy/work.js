const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

var timeout = [];

module.exports = {
    data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn money.'),
    async execute(interaction, client) {

        const { guild, user } = interaction;
        let data = await ecoS.findOne({ Guild: guild.id, User: user.id });

        if (timeout.includes(interaction.user.id)) return await interaction.reply({ content: "come back in **5mins** to work again!", ephemeral: true });

        if (!data) return await interaction.reply({ content: "You don't have an account, create one using \`/economy-create account\`", ephemeral: true });
        else {
            const jobs = [
                "Policemen",
                "Builder",
                "Uber driver",
                "Waiter",
                "Chef",
                "Software Engineer",
                "Streamer",
                "Reporter",
                "Firefighter"
            ];

            const jobPick = jobs[Math.floor(Math.random() * jobs.length)];

            const amount = Math.round((Math.random() * 1000) + 10);

            const hours = Math.round((Math.random() * 15) + 8);

            const pph = Math.round(amount / hours);

            data.Bank += amount;
            data.Worked += 1;
            data.HoursWorked += hours;
            data.CommandsRan += 1;
            data.save();

            const embed = new EmbedBuilder()
            .setAuthor({ name: `Economy System ${client.config.devBy}` })
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(`You worked as a **${jobPick}**\n\n• Hours Worked: **${hours}** hrs\n• Pay for the day: **$${amount}**\n• Pay per hour: **$${pph}**`)
            .setFooter({ text: `Come back in 5 minutes and run /work` })
            .setColor(client.config.embedEconomy)
            .setTimestamp()

            await interaction.reply({ embeds: [embed] });

            timeout.push(interaction.user.id);
            setTimeout(() => {
                timeout.shift();
            }, 300000);
        }
    }
}