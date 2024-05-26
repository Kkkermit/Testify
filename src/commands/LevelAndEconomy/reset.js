const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const levelSchema = require ("../../schemas/userLevelSystem");
const ecoSchema = require ("../../schemas/economySystem");
const levelschema = require('../../schemas/levelSetupSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription(`Reset something in this server.`)
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionsBitField.Administrator)
    .addSubcommand(command => command.setName('all-xp').setDescription('Resets all XP progress in this server.'))
    .addSubcommand(command => command.setName('all-currency').setDescription('Resets all economy progress in this server.'))
    .addSubcommand(command => command.setName('currency').setDescription(`Resets specified user's economy currency.`).addUserOption(option => option.setName('user').setDescription(`Specified user's economy account will be reset.`).setRequired(true)))
    .addSubcommand(command => command.setName('xp').setDescription(`Resets specified user's XP.`).addUserOption(option => option.setName('user').setDescription('Specified user will have their xp reset.').setRequired(true))),
    async execute(interaction) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});
        const sub = interaction.options.getSubcommand();
        
        switch (sub) {

            case 'all-xp':

            const levelsetup = await levelschema.findOne({ Guild: interaction.guild.id });
            if (!levelsetup || levelsetup.Disabled === 'disabled') return await interaction.reply({ content: `The **Administrators** of this server **have not** set up the **leveling system** yet!`, ephemeral: true});

            levelSchema.deleteMany({ Guild: interaction.guild.id}, async (err, data) => {

                const embed = new EmbedBuilder()
                .setColor(client.config.embedLevels)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Leveling System Reset ${client.config.devBy}`})
                .setFooter({ text: `Leveling System XP Reset`})
                .setTimestamp()
                .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
                .addFields({ name: `Level data wiped`, value: `All the level data has been wiped from the server. Users XP has been reset to \`\`0\`\`.`})
    
                await interaction.reply({ embeds: [embed] })
    
            })

            break;
            case 'xp':

            const levelsetup1 = await levelschema.findOne({ Guild: interaction.guild.id });
            if (!levelsetup1 || levelsetup1.Disabled === 'disabled') return await interaction.reply({ content: `The **Administrators** of this server **have not** set up the **leveling system** yet!`, ephemeral: true});

            const target = interaction.options.getUser('user');

            levelSchema.deleteMany({ Guild: interaction.guild.id, User: target.id}, async (err, data) => {

                const embed = new EmbedBuilder()
                .setColor(client.config.embedLevels)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Leveling System Reset ${client.config.devBy}`})
                .setFooter({ text: `Leveling System XP Reset`})
                .setTimestamp()
                .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
                .addFields({ name: `Level data wiped`, value: `${target.username}'s XP has been reset to \`\`0\`\`.`})

                await interaction.reply({ embeds: [embed] })

            })

            break;
            case 'currency':

            const user = interaction.options.getUser('user');

            ecoSchema.findOne({ Guild: interaction.guild.id, User: user.id}, async (err, data) => {

                const embed = new EmbedBuilder()
                .setColor(client.config.embedEconomy)
                .setAuthor({ name: `Economy System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(`Reset **${user.username}**'s economy account.`)
                .setFooter({ text: `${interaction.guild.name}'s Economy`, iconURL: interaction.guild.iconURL() })
                .setTimestamp()

                if (err) throw err;
    
                if (!data) return await interaction.reply({ content: `${user} needs to have **created** a past account in order to add to their currency.`, ephemeral: true})

                const Data = await ecoSchema.findOne({ Guild: interaction.guild.id, User: user.id});

                if (Data.Wallet + Data.Bank === 0) {
                    return await interaction.reply({ content: `${user} has **no money**, you **do not** need to reset their money.`, ephemeral: true})
                } else {
                
                    Data.Wallet = 0;
                    Data.Bank = 0;
                    Data.save();

                    interaction.reply({ embeds: [embed]})
            
                }
            })

            break;
            case 'all-currency':

            ecoSchema.deleteMany({ Guild: interaction.guild.id}, async (err, data) => {

                const embed = new EmbedBuilder()
                .setColor(client.config.embedEconomy)
                .setAuthor({ name: `Economy System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setDescription(`Reset **all** economy accounts in the ${interaction.guild.name}!`)
                .setFooter({ text: `${interaction.guild.name}'s Economy`, iconURL: interaction.guild.iconURL() })
                .setTimestamp()
    
                await interaction.reply({ embeds: [embed] })
    
            })
        }
    }
}