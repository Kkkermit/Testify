const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ecoSchema = require('../../schemas/economySystem');
const levelSchema = require('../../schemas/userLevelSystem');
const levelschema = require('../../schemas/levelSetupSystem');

module.exports = {
    usableInDms: false,
    category: "Level and Economy",
    permissions: [PermissionFlagsBits.Administrator],
    data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Give a user specified amount of currency.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName('currency').setDescription('Give specified user specified amount of economy currency.')
        .addUserOption(option => option.setName('user').setDescription('Specified user will be given specified amount of currency.').setRequired(true))
        .addStringOption(option => option.setName('amount').setDescription('Amount of money to give (supports k/m suffixes)').setRequired(true))
        .addStringOption(option => option.setName('type').setDescription('Where to add the money').setRequired(true)
            .addChoices(
                { name: 'Wallet', value: 'wallet' },
                { name: 'Bank', value: 'bank' }
            )))
    .addSubcommand(command => command.setName('xp').setDescription('Give specified user specified amount of XP.').addUserOption(option => option.setName('user').setDescription('Specified user will be given specified amount of XP.').setRequired(true)).addNumberOption(option => option.setName('amount').setDescription('The amount of XP you want to give specified user.').setRequired(true).setMaxValue(10000000).setMinValue(10))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        switch (sub) {

            case 'currency':

            const user = interaction.options.getUser('user');
            const amountInput = interaction.options.getString('amount');
            const type = interaction.options.getString('type');

            let amount;
            try {
                if (amountInput.toLowerCase().endsWith('k')) {
                    amount = parseInt(amountInput.slice(0, -1)) * 1000;
                } else if (amountInput.toLowerCase().endsWith('m')) {
                    amount = parseInt(amountInput.slice(0, -1)) * 1000000;
                } else {
                    amount = parseInt(amountInput);
                }
                
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({
                        content: "Please enter a valid positive amount.",
                        flags: MessageFlags.Ephemeral
                    });
                }
            } catch (error) {
                return interaction.reply({
                    content: "Invalid amount format. Please provide a valid number.",
                    flags: MessageFlags.Ephemeral
                });
            }

            let userData = await ecoSchema.findOne({ Guild: interaction.guild.id, User: user.id });
            
            if (!userData) {
                userData = new ecoSchema({
                    Guild: interaction.guild.id,
                    User: user.id,
                    Bank: 0,
                    Wallet: 0
                });
            }
            
            if (type === 'wallet') {
                userData.Wallet += amount;
            } else if (type === 'bank') {
                userData.Bank += amount;
            }
            
            await userData.save();

            const economyEmbed = new EmbedBuilder()
            .setAuthor({ name: `Economy System ${client.config.devBy}` })
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .setThumbnail(client.user.displayAvatarURL())
            .setColor(client.config.embedEconomy)
            .setDescription(`You've given **$${amount.toLocaleString()}** to ${user.tag}`)
            .addFields(
                { name: '💵 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '🏦 Destination', value: type === 'wallet' ? 'Wallet' : 'Bank', inline: true },
                { name: '👤 Recipient', value: `${user.tag}`, inline: true }
            )
            .setFooter({ text: `${interaction.guild.name}'s Economy`, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

            interaction.reply({ embeds: [economyEmbed], flags: MessageFlags.Ephemeral})

        break;
        case 'xp':

        const levelsetup = await levelschema.findOne({ Guild: interaction.guild.id });
        if (!levelsetup || levelsetup.Disabled === 'disabled') return await interaction.reply({ content: `The **Administrators** of this server **have not** set up the **leveling system** yet!`, flags: MessageFlags.Ephemeral});

        const xpuser = interaction.options.getUser('user');
        const xpamount = interaction.options.getNumber('amount');

        levelSchema.findOne({ Guild: interaction.guild.id, User: xpuser.id}, async (err, data) => {

            if (err) throw err;
    
            if (!data) return await interaction.reply({ content: `${xpuser} needs to have **earned** past XP in order to add to their XP.`, flags: MessageFlags.Ephemeral})

            const give = xpamount;

            const Data = await levelSchema.findOne({ Guild: interaction.guild.id, User: xpuser.id});

            if (!Data) return;
            
            Data.XP += give;
            Data.save();

            const xpEmbed = new EmbedBuilder()
            .setAuthor({ name: `Leveling System ${client.config.devBy}` })
            .setTitle(`${client.user.username} Leveling System ${client.config.arrowEmoji}`)
            .setThumbnail(client.user.displayAvatarURL())
            .setColor(client.config.embedLevels)
            .setDescription(`Gave **${xpuser.username}** **${xpamount}**XP.`)
            .setFooter({ text: `${interaction.guild.name}'s Leveling`, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

            interaction.reply({ embeds: [xpEmbed], flags: MessageFlags.Ephemeral})
        })
        }
    }
}