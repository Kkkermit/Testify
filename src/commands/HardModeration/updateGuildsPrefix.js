const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');
const prefixSchema = require('../../schemas/prefixSystem.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Change the prefix of the bot in your server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName('change').setDescription('Change the prefix of the bot in your server.') .addStringOption(option => option.setName('prefix').setDescription('The new prefix you want to set.').setRequired(true)))
    .addSubcommand(command => command.setName('check').setDescription('Check the current prefix of the bot in your server.'))
    .addSubcommand(command => command.setName('reset').setDescription('Reset the prefix of the bot in your server back to the default.')),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

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
                if (!data2) return interaction.reply({ content: 'The prefix is already set to the default!', ephemeral: true });

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
        };
    },
};