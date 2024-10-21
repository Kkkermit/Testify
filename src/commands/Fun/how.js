const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('how')
    .setDescription('Calculates how much of specified topic you are.')
    .addSubcommand(command => command.setName('gay').setDescription('Shows how gay you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's gay percentage will be displayed.`)))
    .addSubcommand(command => command.setName('sus').setDescription('Shows how sus you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's sus percentage will be displayed.`)))
    .addSubcommand(command => command.setName('stupid').setDescription('Shows how stupid you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's stupidity percentage will be displayed.`)))
    .addSubcommand(command => command.setName('simp').setDescription('Shows how much of a simp you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's simp percentage will be displayed.`)))
    .addSubcommand(command => command.setName('drunk').setDescription('Shows how drunk you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's drunk percentage will be displayed.`)))
    .addSubcommand(command => command.setName('high').setDescription('Shows how high you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's high percentage will be displayed.`)))
    .addSubcommand(command => command.setName('smart').setDescription('Shows how smart you are, results are accurate.').addUserOption(option => option.setName('user').setDescription(`Specified user's smart percentage will be displayed.`))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();
        let target = interaction.options.getUser('user') || interaction.user;
        let randomizer = Math.floor(Math.random() * 101);

        switch (sub) {
            case 'gay':

            const embed = new EmbedBuilder()
            .setTitle(`> How gay is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🌈 How Gay Tool`})
            .setFooter({ text: `🌈 Gay Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({ name: `• Percentage`, value: `> ${target} is ${randomizer}% **gay** 🍆`})
            .setTimestamp()

            await interaction.reply({embeds: [embed] });

            break;
            case 'sus':

            const embed1 = new EmbedBuilder()
            .setTitle(`> How sus is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🤨 How Sus Tool`})
            .setFooter({ text: `🤨 Sus Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({ name: `• Percentage`, value: `> ${target} is ${randomizer}% **sus** 🤨`})
            .setTimestamp()

            await interaction.reply({embeds: [embed1] });

            break;
            case 'stupid':

            const embed2 = new EmbedBuilder()
            .setTitle(`> How stupid is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🤓 How stupid Tool`})
            .setFooter({ text: `🤓 stupid Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({ name: `• Percentage`, value: `> ${target} is ${randomizer}% **stupid** 🤓`})
            .setTimestamp()

            await interaction.reply({embeds: [embed2] });

            break;
            case 'simp':

            const embed3 = new EmbedBuilder()
            .setTitle(`> How much of a simp is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🥺 How simp Tool`})
            .setFooter({ text: `🥺 simp Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({ name: `• Percentage`, value: `> ${target} is ${randomizer}% **simp** 🥺`})
            .setTimestamp()
            
            await interaction.reply({embeds: [embed3] });

            break;
            case 'drunk':

            const embed4 = new EmbedBuilder()
            .setTitle(`> How drunk is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🍺 How Drunk Tool`})
            .setFooter({ text: `🍺 Drunk Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({ name: `• Percentage`, value: `> ${target} is ${randomizer}% **drunk** 🍺`})
            .setTimestamp()

            await interaction.reply({embeds: [embed4] });

            break;
            case 'high':

            const embed5 = new EmbedBuilder()
            .setTitle(`> How high is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🍁 How High Tool`})
            .setFooter({ text: `🍁 High Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({ name: `• Percentage`, value: `> ${target} is ${randomizer}% **high** 🍁`})
            .setTimestamp()

            await interaction.reply({embeds: [embed5] });

            break;
            case 'smart':

            const minIQ = 2;
            const maxIQ = 200;
            const randomIQ = Math.floor(Math.random() * (maxIQ - minIQ + 1)) + minIQ;
            let message = `${target}'s IQ is ${randomIQ}.`;

            if (randomIQ >= 80) {
                message = `> ${target}'s IQ is high **${randomIQ}** You're a genius! 🧠`;
            } else if (randomIQ <= 50) {
                message = `> ${target}'s IQ is low **${randomIQ}** Keep learning and growing! 📚`;
            }

            const embed6 = new EmbedBuilder()
            .setTitle(`> How smart is ${target.username}?`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `🧠 How Smart Tool`})
            .setFooter({ text: `🧠 Smart Percentage`})
            .setColor(client.config.embedCommunity)
            .addFields({name: '• IQ level', value: (message)})
            .setTimestamp()

            await interaction.reply({ embeds: [embed6] });
        } 
    }
}