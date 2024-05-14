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

        let id = [
            `1234567890`,
            `0987654321`,
            `5432167890`,
            `4673456783`,
            `1295674377`,
            `2364784236`,
            `7985644738`
        ]

        let HackId = id[Math.floor(Math.random() * id.length)];

        const wifiName = [
            `SKY485hd3`,
            `TFGS36H75`,
            `SKY295GH9`,
            `EE23HGD64`,
            `TG67J5G43`,
            `SKY11LLS4`,
            `EEKF45H54`,
        ]

        let HackWifiName = wifiName[Math.floor(Math.random() * wifiName.length)];

        let wifiPassword = [
            `Tgs35Jf4`,
            `Jg5Hf4J5`,
            `Hltg567h`,
            `FFjj3j36`,
            `Pp5Jg5J5`,
            `34PoImmf`,
            `Qgr34671`
        ]

        let HackWifiPassword = wifiPassword[Math.floor(Math.random() * wifiPassword.length)];

        let location  = [
            `12 Pretty Dr \nScole \nDiss \nIP21 4DG`,
            `23 Green Rd \nHalesworth \nIP19 8JH`,
            `45 Blue St \nEye \nIP23 7JG`,
            `67 Red Rd \nHarleston \nIP20 9JF`,
            `89 Yellow St \nBeccles \nNR34 9JG`,
            `90 Orange Rd \nLowestoft \nNR32 9JH`,
            `11 Purple St \nBungay \nNR35 9JF`
        ]

        let HackLocation = location[Math.floor(Math.random() * location.length)];

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

        let dob = [
            `31/02/2005`,
            `12/04/2001`,
            `23/05/2000`,
            `01/01/2001`,
            `21/05/2005`,
            `05/05/2005`,
            `01/01/2005`
        ]

        let HackDob = dob[Math.floor(Math.random() * dob.length)];

        let creditCard = [
            `Credit Card: 1234 5678 9101 1121 \nExpiry Date: 12/23 \nCVV: 123`,
            `Credit Card: 4321 8765 1098 2111 \nExpiry Date: 11/22 \nCVV: 321`,
            `Credit Card: 5678 1234 2111 1098 \nExpiry Date: 10/21 \nCVV: 456`,
            `Credit Card: 8765 4321 1211 9876 \nExpiry Date: 09/20 \nCVV: 789`,
            `Credit Card: 9876 5432 2111 8765 \nExpiry Date: 08/19 \nCVV: 654`,
            `Credit Card: 6543 2109 1112 5432 \nExpiry Date: 07/18 \nCVV: 987`,
            `Credit Card: 3210 9876 2111 2345 \nExpiry Date: 06/17 \nCVV: 321`
        ]

        let HackCreditCard = creditCard[Math.floor(Math.random() * creditCard.length)];

        const embed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} Hacking System`})
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