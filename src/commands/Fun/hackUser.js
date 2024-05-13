const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
    .setName('hack')
    .setDescription('Hack the mentioned user. "its fake so no worries."')
    .addUserOption(option => option.setName('user').setDescription('The mentioned user will get hacked.').setRequired(true)),
    async execute(interaction, client) {

        const target = await interaction.options.getUser(`user`);

        if(!target) return await interaction.reply({ content: '**please pick a target to hack!**', ephemeral: true })
        
        await interaction.reply({ content: `Running the process to hack **${target}**..` })
        await wait(2500);
        await interaction.editReply({ content: `Getting the process ready..` })
        await wait(2500);
        await interaction.editReply({ content: `Installing application on **${target}** devices..` })
        await wait(2500);
        await interaction.editReply({ content: `Getting **${target}** devices password and ID..` })
        await wait(2500);
        await interaction.editReply({ content: `Stealing **${target}** mom credit card..` })
        await wait(2500);
        await interaction.editReply({ content: `Hacking **${target}** computer and Wi-Fi..` })
        await wait(2500);
        await interaction.editReply({ content: `Getting **${target}** location, name, passwords, personal information..` })
        await wait(2500);
        await interaction.editReply({ content: `Exposing **${target}'s** personal information, mom credit card and Wi-Fi..'` })
        await wait(3000);
        await interaction.editReply({ content: `Mission complete! I've successfully hacked **${target}** devices, and exposed everything he has!` })

        const embed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} Hacking System`})
        .setColor(client.config.embedFun)
        .setTitle(`> **${target}'s** data`)
        .addFields(
            { name: `> Device Password:`, value: `\`\`Device Password: ${target.tag}845!!\`\``},
            { name: `> ID:`, value: `\`\`ID: 1234567890\`\`` },
            { name: `> Wifi-name & Password:`, value: `\`\`Wifi-name: SKY485hd3 \nWifi-password: Tgs35Jf4\`\`` },
            { name: `> Location:`, value: `\`\`12 Pretty Dr \nScole \nDiss \nIP21 4DG\`\`` },
            { name: `> Name:`, value: `\`\`Name: ${target.tag} \nUsername: ${target.username}\`\`` },
            { name: '> Password(s):', value: `\`\`Password \n12345 \nAdmin \nPassword123 \n${target.tag}845!!\`\`` },
            { name: `> Personal Information:`, value: `\`\`Name: ${target.tag} \nUsername: ${target.username} \nEmail: ${target.username}69@gmail.com \nDOB: 31/02/2005\`\`` },
            { name: `> Credit Card:`, value: `\`\`Credit Card: 1234 5678 9101 1121 \nExpiry Date: 12/23 \nCVV: 123\`\`` })
        .setFooter({ text: `Hacked by ${interaction.user.tag}`})
        .setTimestamp()
        .setThumbnail(target.avatarURL());

        await wait(2500);
        await interaction.editReply({ embeds: [embed] })
    }
}