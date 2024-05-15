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
        await interaction.editReply({ content: `Stealing **${target}** moms credit card..` })
        await wait(2500);
        await interaction.editReply({ content: `Hacking **${target}** computer and Wi-Fi..` })
        await wait(2500);
        await interaction.editReply({ content: `Getting **${target}** location, name, passwords, personal information..` })
        await wait(2500);
        await interaction.editReply({ content: `Exposing **${target}'s** personal information, mom credit card and Wi-Fi..'` })
        await wait(3000);
        await interaction.editReply({ content: `Mission complete! I've successfully hacked **${target}** devices, and exposed everything he has!` })

        const data = require('../../jsons/hackUsers.json')

        let devicePassword = [        
            `${target.tag}845!!`,
            `1234567890`,
            `sg457DS3Sd`,
            `${target.username}?!02`,
            `Password123`,
            `5239563`,
            `YellowDonkey24`
        ]

        let HackDevicePassword = devicePassword[Math.floor(Math.random() * devicePassword.length)];
        let HackId = data.id[Math.floor(Math.random() * data.id.length)];
        let HackWifiName = data.wifiName[Math.floor(Math.random() * data.wifiName.length)];
        let HackWifiPassword = data.wifiPassword[Math.floor(Math.random() * data.wifiPassword.length)];
        let HackLocation = data.location[Math.floor(Math.random() * data.location.length)];

        let passwords = [
            `Ghd46zh1 \nHltg567h \nAdmin \nPassword123 \n${target.tag}845!!`,
            `Password \nJg5Hf4J5 \n12345 \nFFjj3j36 \nPp5Jg5J5`,
            `Admin \nHltg567h \nPassword123 \n34PoImmf \nQgr34671`,
            `YellowDonkey24 \nSKY11LLS4 \nEEKF45H54 \n2364784236 \n7985644738`,
            `CeleryStick23 \n34Jan2005 \nPass75 \nHltg567h \nAdmin0355`, 
            `01052005 \nJanuary2001 \n${target.tag}123 \nPassword123 \n21${target.tag}2005`,
            `^%$#^&* \nKlff4563d \nPassword55 \n${target.tag}2255 \nAdmin1234`
        ]

        let HackPasswords = passwords[Math.floor(Math.random() * passwords.length)];

        let email = [
            `${target.tag}69@gmail.com`,
            `${target.tag}420@hotmail.com`,
            `${target.username}123@yahoo.com`,
            `${target.tag}69420@outlook.com`,
            `${target.tag}2001@icloud.com`,
            `${target.tag}69@discord.com`
        ]

        let HackEmail = email[Math.floor(Math.random() * email.length)];
        let HackDob = data.dob[Math.floor(Math.random() * data.dob.length)];
        let HackCreditCard = data.creditCard[Math.floor(Math.random() * data.creditCard.length)];

        const embed = new EmbedBuilder()
        .setAuthor({ iconURL: client.user.displayAvatarURL({ dynamic: true}), name: `${client.user.username} Hacking System`})
        .setColor(client.config.embedFun)
        .setTitle(`**${target.tag}'s** data ${client.config.arrowEmoji}`)
        .addFields(
            { name: `> Device Password:`, value: `\`\`Device Password: ${HackDevicePassword}\`\``},
            { name: `> ID:`, value: `\`\`ID: ${HackId}\`\`` },
            { name: `> Wifi-name & Password:`, value: `\`\`Wifi-name: ${HackWifiName} \nWifi-password: ${HackWifiPassword}\`\`` },
            { name: `> Location:`, value: `\`\`${HackLocation}\`\`` },
            { name: `> Name:`, value: `\`\`Name: ${target.tag} \nUsername: ${target.username}\`\`` },
            { name: '> Password(s):', value: `\`\`${HackPasswords}\`\`` },
            { name: `> Personal Information:`, value: `\`\`Name: ${target.tag} \nUsername: ${target.username} \nEmail: ${HackEmail} \nDOB: ${HackDob}\`\`` },
            { name: `> Credit Card:`, value: `\`\`${HackCreditCard}\`\`` })
        .setFooter({ text: `Hacked by ${interaction.user.tag}`})
        .setTimestamp()
        .setThumbnail(target.avatarURL());

        await wait(2500);
        await interaction.editReply({ embeds: [embed] })
    }
}