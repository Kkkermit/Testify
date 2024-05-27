const { ContextMenuCommandBuilder, EmbedBuilder, ApplicationCommandType } = require('discord.js');
const Profile = require('../../schemas/profileSystem');
const moment = require('moment');

module.exports = {
    data: new ContextMenuCommandBuilder()
    .setName('• Profile View')
    .setType(ApplicationCommandType.User),
    async execute(interaction, client) {

        const user = interaction.options.getUser('user') || interaction.user;
        
        const userProfile = await Profile.findOne({ userId: user.id });

        if (!userProfile) {
            await interaction.reply({ content: `No profile found for ${user.tag}.`, ephemeral: true });
            return;
        }

        const profileEmbed = new EmbedBuilder()
        .setAuthor({ name: `Profile Viewer ${client.config.devBy}` })
        .setDescription(`> 📌 **${user.tag}'s Profile**`)
        .setColor(client.config.embedProfile)
        .setTitle(`${client.user.username} Profile System ${client.config.arrowEmoji}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: '🎵 Favorite Song', value: `\`\`\`${userProfile.favoriteSong || 'Not set'}\`\`\``, inline: true },
            { name: '📖 About', value: `\`\`\`${userProfile.about || 'Not set'}\`\`\``, inline: true })

        if (userProfile.birthday) {
            const now = moment();
            let nextBirthday = moment(userProfile.birthday).year(now.year());
            if (nextBirthday.isBefore(now, 'day')) {
                nextBirthday.add(1, 'year');
            }
            const daysUntilBirthday = nextBirthday.diff(now, 'days');
            profileEmbed.addFields({ name: '🎉 Next Birthday', value: `\`\`\`In ${daysUntilBirthday} day(s)\`\`\``, inline: true });
        }

        if (userProfile.hobbies) {
            profileEmbed.addFields({ name: '🎈 Hobbies', value: `\`\`\`${userProfile.hobbies || 'Not set'}\`\`\``, inline: true });
        }

        if (userProfile.favoriteGame) {
            profileEmbed.addFields({ name: '🎮 Favorite Game', value: `\`\`\`${userProfile.favoriteGame || 'Not set'}\`\`\``, inline: true });
        }

        profileEmbed
            .setFooter({ text: `Profile ID: ${userProfile._id}` })
            .setTimestamp(new Date(userProfile.createdAt));

        await interaction.reply({ embeds: [profileEmbed] });
    },
}