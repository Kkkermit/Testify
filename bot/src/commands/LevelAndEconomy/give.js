const { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const ecoSchema = require('../../schemas/economySystem');
const levelSchema = require('../../schemas/userLevelSystem');
const levelschema = require('../../schemas/levelSetupSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('give')
    .setDMPermission(false)
    .setDescription('Give a user specified amount of currency.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName('currency').setDescription('Give specified user specified amount of economy currency.').addUserOption(option => option.setName('user').setDescription('Specified user will be given specified amount of currency.').setRequired(true)).addNumberOption(option => option.setName('amount').setDescription('The amount of currency you want to give specified user.').setRequired(true).setMaxValue(100000000)))
    .addSubcommand(command => command.setName('xp').setDescription('Give specified user specified amount of XP.').addUserOption(option => option.setName('user').setDescription('Specified user will be given specified amount of XP.').setRequired(true)).addNumberOption(option => option.setName('amount').setDescription('The amount of XP you want to give specified user.').setRequired(true).setMaxValue(10000000).setMinValue(10))),
    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});
        const sub = interaction.options.getSubcommand();

        switch (sub) {

            case 'currency':

            const user = interaction.options.getUser('user');
            const amount = interaction.options.getNumber('amount');

            ecoSchema.findOne({ Guild: interaction.guild.id, User: user.id}, async (err, data) => {

            if (err) throw err;
    
            if (!data) return await interaction.reply({ content: `${user} needs to have **created** a past account in order to add to *their* currency.`, ephemeral: true})

            const give = amount;

            const Data = await ecoSchema.findOne({ Guild: interaction.guild.id, User: user.id});

            Data.Wallet += give;
            Data.save();

            const economyEmbed = new EmbedBuilder()
            .setAuthor({ name: `Economy System ${client.config.devBy}` })
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .setThumbnail(client.user.displayAvatarURL())
            .setColor(client.config.embedEconomy)
            .setDescription(`Gave **${user.username}** **$${amount}**.`)
            .setFooter({ text: `${interaction.guild.name}'s Economy`, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

            interaction.reply({ embeds: [economyEmbed], ephemeral: true})
        })

        break;
        case 'xp':

        const levelsetup = await levelschema.findOne({ Guild: interaction.guild.id });
        if (!levelsetup || levelsetup.Disabled === 'disabled') return await interaction.reply({ content: `The **Administrators** of this server **have not** set up the **leveling system** yet!`, ephemeral: true});

        const xpuser = interaction.options.getUser('user');
        const xpamount = interaction.options.getNumber('amount');

        levelSchema.findOne({ Guild: interaction.guild.id, User: xpuser.id}, async (err, data) => {

            if (err) throw err;
    
            if (!data) return await interaction.reply({ content: `${xpuser} needs to have **earned** past XP in order to add to their XP.`, ephemeral: true})

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

            interaction.reply({ embeds: [xpEmbed], ephemeral: true})
        })
        }
    }
}