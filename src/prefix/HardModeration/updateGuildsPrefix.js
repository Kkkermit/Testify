const { EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const prefixSchema = require('../../schemas/prefixSystem.js');

module.exports = {
    name: 'change-prefix',
    aliases: ['uprefix', 'cprefix'],
    description: 'Change the prefix for the bot in this server',
    usage: 'change-prefix <prefix>',
    category: 'Moderation',
    usableInDms: false,
    permissions: [PermissionFlagsBits.Administrator],
    async execute(message, client, args)  {

        const prefix = args[0];
        if (prefix.length > 4) return message.channel.send({ content: 'The prefix **cannot** be longer than 4 characters!', flags: MessageFlags.Ephemeral });

        const data = await prefixSchema.findOne({ Guild: message.guild.id });
        if (!data) {
            await new prefixSchema({
                Guild: message.guild.id,
                Prefix: prefix
            }).save();
        } else {
            await prefixSchema.findOneAndUpdate({
                Guild: message.guild.id,
                Prefix: prefix
            });
        }

        const embed = new EmbedBuilder()
        .setColor(client.config.embedModHard)
        .setAuthor({ name: `Prefix update command ${client.config.devBy}`})
        .setTitle(`${client.user.username} prefix update ${client.config.arrowEmoji}`)
        .setDescription(`The prefix has been changed to **\`${prefix}\`**`)
        .setTimestamp()
        .setFooter({ text: `Prefix updated by ${message.author.username}`});

        await message.channel.send({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}