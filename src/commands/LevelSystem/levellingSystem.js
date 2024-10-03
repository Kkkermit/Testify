const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const levelschema = require('../../schemas/levelSetupSystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('leveling-system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDescription('Configure your leveling system.')
    .addSubcommand(command => command.setName('role-multiplier').setDescription('Set up an XP multiplier for a specified role.').addRoleOption(option => option.setName('role').setDescription('Specified role will receive a multiplier.').setRequired(true)).addStringOption(option => option.setName('multiplier').addChoices(
        { name: '1.5x Multiplier', value: '1.5'},
        { name: '2x Multiplier', value: '2'},
        { name: '2.5x Multiplier', value: '2.5'},
        { name: '3x Multiplier', value: '3'},
        { name: '5x Multiplier', value: '5'},
        { name: 'EXTREME: 10x Multiplier', value: '10'},
        { name: 'EXTREME: 100x Multiplier', value: '100'},
        { name: 'EXTREME: 1000x Multiplier', value: '1000'}
    ).setRequired(true).setDescription('Specified amount of multiplier will be applied to specified role.')))
    .addSubcommand(command => command.setName('disable').setDescription('Disables your leveling system.'))
    .addSubcommand(command => command.setName('enable').setDescription('Enables your leveling system.').addChannelOption(option => option.setName('channel').setDescription('Channel where level message is sent, If blank message will be sent to channel where user last was').setRequired(false)))
    .addSubcommand(command => command.setName('disable-multiplier').setDescription('Disables the multiplier of your role.')),
    async execute(interaction, client) {

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        const sub = await interaction.options.getSubcommand();
        const multiplier = await interaction.options.getString('multiplier');
        const multirole = await interaction.options.getRole('role');
        const leveldata = await levelschema.findOne({ Guild: interaction.guild.id });

        switch (sub) {

            case 'enable':

            if (leveldata && leveldata.Disabled === 'enabled') return await interaction.reply({ content: `You **already** have your **leveling system** set up. \n> Do **\`\`/leveling disable\`\`** to undo.`, ephemeral: true});
            else {
                const channel = interaction.options.getChannel('channel');
                const levelUpChannelId = channel ? channel.id : 'current';

                const setupEmbed = new EmbedBuilder()
                    .setColor(client.config.embedLevels)
                    .setThumbnail(client.user.avatarURL())
                    .setAuthor({ name: `Leveling System ${client.config.devBy}` })
                    .setFooter({ text: `Leveling System Setup` })
                    .setTimestamp()
                    .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
                    .addFields({ name: `Leveling was set up`, value: `Your members will now be able to earn XP through the leveling system!` })
                    .addFields({ name: `Level Up Channel`, value: `${channel ? `<#${channel.id}>` : 'Current Channel'}` });

                if (leveldata) {
                    await levelschema.updateOne({ Guild: interaction.guild.id }, { $set: { Disabled: 'enabled', LevelUpChannel: levelUpChannelId } });
                } else {
                    await levelschema.create({
                        Guild: interaction.guild.id,
                        Disabled: 'enabled',
                        Role: ' ',
                        Multiplier: ' ',
                        LevelUpChannel: levelUpChannelId
                    });
                }
                await interaction.reply({ embeds: [setupEmbed] })
            }

            break;
            case 'disable':

            if (!leveldata || leveldata.Disabled === 'disabled') return await interaction.reply({ content: `You **have not** set up your **leveling system** yet. \n> Do **\`\`/leveling enable\`\`** to setup your **leveling system**.`, ephemeral: true });
            else {

                const disableEmbed = new EmbedBuilder()
                .setColor(client.config.embedLevels)
                .setThumbnail(client.user.avatarURL())
                .setAuthor({ name: `Leveling System ${client.config.devBy}`})
                .setFooter({ text: `Leveling System Removed`})
                .setTimestamp()
                .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
                .addFields({ name: `Leveling was Disabled`, value: `Your members will no longer be able to earn XP through the leveling system!`})
                
                await levelschema.updateOne({ Guild: interaction.guild.id }, { $set: { Disabled: 'disabled' }});
                
                await interaction.reply({ embeds: [disableEmbed] });
            }

            break;
            case 'role-multiplier':

            if (!leveldata || leveldata.Disabled === 'disabled') return await interaction.reply({ content: `You **have not** set up your **leveling system** yet.`, ephemeral: true});
            else {

                if (leveldata.Role !== ' ') return await interaction.reply({ content: `You **already** have a multiplier role **set up**! (${leveldata.Role})`, ephemeral: true});
                else {
                    await levelschema.updateOne({ Guild: interaction.guild.id }, { $set: { Role: multirole.id }});
                    await levelschema.updateOne({ Guild: interaction.guild.id }, { $set: { Multi: multiplier }});
                    await interaction.reply({ content: `Your role ${multirole} has been **set up** to receive **multiplied** XP! Multiplication level: **${multiplier}**x`, ephemeral: true})
                } 
            }

            break;
            case 'disable-multiplier':

            if (!leveldata || leveldata.Disabled === 'disabled') return await interaction.reply({ content: `You **have not** set up your **leveling system** yet.`, ephemeral: true});
            else {
                if (leveldata.Role === ' ') return await interaction.reply({ content: `You **have not** set up a role multiplier yet, cannot disable **nothing**..`, ephemeral: true});
                else {
                    await interaction.reply({ content: `Your multiplier role <@&${leveldata.Role}> has been **disabled**!`, ephemeral: true });
                    await levelschema.updateOne({ Guild: interaction.guild.id }, { $set: { Role: ' ' }});
                    await levelschema.updateOne({ Guild: interaction.guild.id }, { $set: { Multi: ' ' }});
                }
            }
        }
    }
}