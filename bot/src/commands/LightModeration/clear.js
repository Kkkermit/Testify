const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, PermissionFlagsBits} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(option => option.setName('amount').setDescription('The number of messages to clear (up to 99)').setRequired(true))
    .addUserOption(option => option.setName('user').setDescription('Clear messages of a specific user')),
    
    async execute(interaction, client) {

    const { options } = interaction;

    const amount = options.getString('amount');
    const user = options.getUser('user');
        
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true });
        }
        
        if (isNaN(amount) || parseInt(amount) < 1 || parseInt(amount) > 99) {
            return interaction.reply({ content: 'Please provide a valid number between 1 and 99.', ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });

        const deletedSize = await deleteMessages(interaction.channel, parseInt(amount), user);

        const deletedUser = user ? user.username : 'everyone';

        const clearEmbed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} purge command ${client.config.devBy}`})
        .setColor(client.config.embedModLight)
        .setTitle(`Purge command used in ${interaction.channel} ${client.config.arrowEmoji}`)
        .setDescription(`> Successfully deleted **${deletedSize}** messages sent by **${deletedUser}**.`)
        .setThumbnail(client.user.avatarURL())
        .setFooter({ text: `Purge command`})
        .setTimestamp()

        return interaction.followUp({ embeds: [clearEmbed], ephemeral: true });

    }
}

async function deleteMessages(channel, totalToDelete, user) {
	let remaining = totalToDelete;
	let count;
	if (user) {
		let messages;
		while (remaining > 0) {
			messages = await channel.messages.fetch()
				.then(messages => messages.filter(m => m.author.id === user.id))
				.then(messages => messages.first(parseInt(remaining)));
			const deleteCount = remaining > 100 ? 100 : remaining;
			// the true here forces the bot to delete msgs that older then 14 days.
			count += await channel.bulkDelete(messages, true);
			remaining -= deleteCount;
		}
		return count;
	}
	while (remaining > 0) {
		const deleteCount = remaining > 100 ? 100 : remaining;
		// the true here forces the bot to delete msgs that older then 14 days.
		count += await channel.bulkDelete(deleteCount, true);
		remaining -= deleteCount;
	}
	return count;
}