const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const prefixSchema = require('../../schemas/prefixSystem.js')
const prefixSetupSchema = require('../../schemas/prefixEnableSystem.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Change the prefix of the bot in your server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName('change').setDescription('Change the prefix of the bot in your server.') .addStringOption(option => option.setName('prefix').setDescription('The new prefix you want to set.').setRequired(true)))
    .addSubcommand(command => command.setName('check').setDescription('Check the current prefix of the bot in your server.'))
    .addSubcommand(command => command.setName('reset').setDescription('Reset the prefix of the bot in your server back to the default.'))
    .addSubcommand(command => command.setName('enable').setDescription('Enable the prefix system in your server.').addBooleanOption(option => option.setName('enable').setDescription('Enable the prefix system in your server.').setRequired(true)).addStringOption(option => option.setName("prefix").setDescription("The prefix you want to set for the bot in your server. Leave blank to set to default prefix").setRequired(false)))
    .addSubcommand(command => command.setName('disable').setDescription('Disable the prefix system in your server.')),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

        const prefixSetupData = await prefixSetupSchema.findOne({ Guild: interaction.guild.id });
        if (sub !== 'enable' && sub !== 'disable' && (!prefixSetupData || !prefixSetupData.Enabled)) {
            return await interaction.reply({ content: 'You **cannot** use this command as the prefix system has not yet been enabled. To enable the prefix system run **\`prefix enable\`**', ephemeral: true });
        }

        switch(sub) {
            case 'change':
            try {

                const prefix = interaction.options.getString('prefix');
                if (prefix.length > 4) return interaction.reply({ content: 'The prefix **cannot** be longer than 4 characters!', ephemeral: true });

                const data = await prefixSchema.findOne({ Guild: interaction.guild.id });
                if (!data) {
                    await new prefixSchema({
                        Guild: interaction.guild.id,
                        Prefix: prefix
                    }).save();
                } else {
                    await prefixSchema.findOneAndUpdate({
                        Guild: interaction.guild.id,
                        Prefix: prefix
                    });
                }

                const embed = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `Prefix update command ${client.config.devBy}`})
                .setTitle(`${client.user.username} prefix update ${client.config.arrowEmoji}`)
                .setDescription(`The prefix has been changed to **\`${prefix}\`**`)
                .setTimestamp()
                .setFooter({ text: `Prefix updated by ${interaction.user.username}`});

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: `Whoops, something went wrong! Please try again.`, ephemeral: true });
            }

            break;
            case 'check':
            try {

                const data1 = await prefixSchema.findOne({ Guild: interaction.guild.id });
                if (!data1) return interaction.reply({ content: `The prefix for ${interaction.guild.name} has not been updated and is using the default one of **\`${client.config.prefix}\`**`, ephemeral: true });

                const embed1 = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `Prefix check command ${client.config.devBy}`})
                .setTitle(`${client.user.username} prefix check ${client.config.arrowEmoji}`)
                .setDescription(`The prefix for this server is **\`${data1.Prefix}\`**`)
                .setTimestamp()
                .setFooter({ text: `Prefix checked by ${interaction.user.username}`});

                await interaction.reply({ embeds: [embed1] });
            } catch (err) {
                await interaction.reply({ content: `Whoops, something went wrong! Please try again.`, ephemeral: true });
            }

            break;
            case 'reset':
            try {
                const data2 = await prefixSchema.findOne({ Guild: interaction.guild.id });
                if (!data2) return interaction.reply({ content: `The prefix is already set to the **default!** ( \`\`${client.config.prefix}\`\` )`, ephemeral: true });

                await prefixSchema.findOneAndDelete({ Guild: interaction.guild.id });

                const embed2 = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `Prefix reset command ${client.config.devBy}`})
                .setTitle(`${client.user.username} prefix reset ${client.config.arrowEmoji}`)
                .setDescription(`The prefix has been reset to **\`${client.config.prefix}\`**`)
                .setTimestamp()
                .setFooter({ text: `Prefix reset by ${interaction.user.username}`});
                
                await interaction.reply({ embeds: [embed2], ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: `Whoops, something went wrong! Please try again.`, ephemeral: true });
            }

            break;
            case 'enable':
            try {
                const enable = interaction.options.getBoolean('enable');
                let customPrefix = interaction.options.getString('prefix');

                if (!enable) {
                    return await interaction.reply({ content: "The prefix system won't be enabled and data has not been saved. To enable the prefix system, please choose the option **\`True\`** when trying again. If you just wanted to change the prefix, please use the command **\`prefix change <prefix>\`**", ephemeral: true });
                }

                if (!customPrefix) {
                    customPrefix = client.config.prefix;
                }

                if (typeof customPrefix === 'string' && customPrefix.length > 4) {
                    return interaction.reply({ content: 'The prefix **cannot** be longer than 4 characters!', ephemeral: true });
                }

                const customPrefixData = await prefixSchema.findOne({ Guild: interaction.guild.id });
                if (!customPrefixData) {
                    await new prefixSchema({
                        Guild: interaction.guild.id,
                        Prefix: customPrefix
                    }).save();
                } else {
                    await prefixSchema.findOneAndUpdate({
                        Guild: interaction.guild.id,
                        Prefix: customPrefix
                    });
                }

                const data = await prefixSetupSchema.findOne({ Guild: interaction.guild.id });
                if (!data) {
                    await new prefixSetupSchema({
                        Guild: interaction.guild.id,
                        Prefix: customPrefix,
                        Enabled: enable
                    }).save();
                } else {
                    if (data.Enabled) {
                        return await interaction.reply({ content: 'The prefix system is already **enabled** in this guild.', ephemeral: true });
                    }
                    data.Prefix = customPrefix;
                    data.Enabled = enable;
                    await data.save();
                }

                const embed3 = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `Prefix setup command ${client.config.devBy}`})
                .setTitle(`${client.user.username} prefix setup ${client.config.arrowEmoji}`)
                .setDescription(`The prefix system has been **${enable ? 'enabled' : 'disabled'}**!`)
                .addFields({ name: 'Prefix', value: `The prefix has been set to **\`${customPrefix}\`**`})
                .addFields({ name: 'Change Custom Prefix', value: `*To change the custom prefix, run \`/prefix change <prefix>\`*`})
                .addFields({ name: 'Disable Prefix', value: "*To disable the prefix system, run `/prefix disable`*"})
                .setTimestamp()
                .setFooter({ text: `Prefix system setup by ${interaction.user.username}`});

                await interaction.reply({ embeds: [embed3], ephemeral: false });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `Whoops, something went wrong! Please try again.`, ephemeral: true });
            }
            break;

            case 'disable':
            try {
                const data = await prefixSetupSchema.findOne({ Guild: interaction.guild.id });
                if (!data || !data.Enabled) {
                    return await interaction.reply({ content: 'The prefix system is already **disabled** in this guild', ephemeral: true });
                }
                data.Enabled = false;
                await data.save();

                await prefixSchema.findOneAndDelete({ Guild: interaction.guild.id });

                await interaction.reply({ content: 'The prefix system has been **disabled**.', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `Whoops, something went wrong! Please try again.`, ephemeral: true });
            }
            break;
        };
    },
};