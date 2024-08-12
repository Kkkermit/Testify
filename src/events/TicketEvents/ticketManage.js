const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TicketSchema = require('../../schemas/ticketSystem');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        const { guild, customId, channel } = interaction;

        const { SendMessages } = PermissionFlagsBits;

        if(!['ticket-manage-menu']
            .includes(customId)) return;

        await interaction.deferUpdate();
		await interaction.deleteReply();

        TicketSchema.findOne({GuildID: guild.id, ChannelID: channel.id}, async (err, data) => {
            if (err) throw err;

            const errEmbed = new EmbedBuilder()
            .setColor('Red')
            .setDescription(`${client.config.ticketError} \nIf you believe this to be an error in the bot, please use \`\`/bug-report\`\` and report the problem to the developers.`)
            .setTitle('Somethings gone wrong...')
            .setTimestamp()

            if (!data) 
                return interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(error => { return });
            const findMembers = await TicketSchema.findOne({ GuildID: guild.id, ChannelID: channel.id, MembersID: interaction.values[0] });

            if(!findMembers) {
                data.MembersID.push(interaction.values[0]);
                channel.permissionOverwrites.edit(interaction.values[0], { SendMessages: true, ViewChannel: true, ReadMessageHistory: true }).catch(error => {return});

                const addEmbed = new EmbedBuilder()
                .setColor('Green')
                .setDescription('<@' + interaction.values[0] + '>' + ' ' + client.config.ticketMemberAdd)

                interaction.channel.send({ embeds: [addEmbed] }).catch(error => { return });
                data.save();

            } else {
                data.MembersID.remove(interaction.values[0]);
                channel.permissionOverwrites.delete(interaction.values[0]).catch(error => { return });

                const removeEmbed = new EmbedBuilder()
                .setColor('Green')
                .setDescription('<@' + interaction.values[0] + '>' + ' ' + client.config.ticketMemberRemove)

                interaction.channel.send({ embeds: [removeEmbed] }).catch(error => { return });
                data.save();
            }
        })
    }
}