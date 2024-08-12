const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../schemas/profileSystem');
const filter = require('../../jsons/filter.json');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Profile system')
    .addSubcommand(command => command.setName('create').setDescription('Creates a user profile.').addStringOption(option => option.setName('favorite_song').setDescription('Your favorite song').setRequired(true)).addStringOption(option => option.setName('about').setDescription('Something about you').setRequired(true)).addStringOption(option => option.setName('birthday').setDescription('Your birthday (YYYY-MM-DD)').setRequired(false)).addStringOption(option => option.setName('hobbies').setDescription('Your hobbies').setRequired(false)).addStringOption(option => option.setName('favorite_game').setDescription('Your favorite game').setRequired(false)))
    .addSubcommand(command => command.setName('edit').setDescription('Edits your user profile.').addStringOption(option => option.setName('favorite_song').setDescription('Your new favorite song').setRequired(false)).addStringOption(option => option.setName('about').setDescription('Something new about you').setRequired(false)).addStringOption(option => option.setName('birthday').setDescription('Your birthday (YYYY-MM-DD)').setRequired(false)).addStringOption(option => option.setName('hobbies').setDescription('Your new hobbies').setRequired(false)).addStringOption(option => option.setName('favorite_game').setDescription('Your new favorite game').setRequired(false)))
    .addSubcommand(command => command.setName('view').setDescription('Views a user profile.').addUserOption(option => option.setName('user').setDescription('The user to view the profile of').setRequired(false))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'create':

            const createUserId = interaction.user.id;

            const createFavoriteSong = interaction.options.getString('favorite_song');
            const createAbout = interaction.options.getString('about');
            const createHobbies = interaction.options.getString('hobbies') || '';
            const createFavoriteGame = interaction.options.getString('favorite_game') || '';

            if (filter.words.includes(createAbout)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});
            if (filter.words.includes(createHobbies)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

            const existingProfile = await Profile.findOne({ userId: createUserId });

            if (existingProfile) {
                await interaction.reply({ content: 'You already have a profile created. You cannot create another one.', ephemeral: true });
                return; 
            }
            const birthdayString = interaction.options.getString('birthday');
            let birthday;
            if (birthdayString) {
                birthday = new Date(birthdayString);
                if (isNaN(birthday.getTime())) {
                    await interaction.reply({ content: 'Invalid date format. Please use YYYY-MM-DD.', ephemeral: true });
                    return;
                }
            }

            const newProfileData = {
                userId: interaction.user.id,
                favoriteSong: createFavoriteSong,
                about: createAbout,
                hobbies: createHobbies,
                favoriteGame: createFavoriteGame,
            };
            if (birthday) newProfileData.birthday = birthday;

            const newProfile = new Profile(newProfileData);

            try {
                await newProfile.save();
                await interaction.reply({ content: 'Your profile has been created!', ephemeral: true });
            } catch (error) {
                console.error("Error saving to MongoDB", error);
                await interaction.reply({ content: 'There was an error creating your profile. Please try again later.', ephemeral: true });
            }

            break;
            case 'edit':

            const userId = interaction.user.id;

            const favoriteSong = interaction.options.getString('favorite_song');
            const about = interaction.options.getString('about');
            const birthdayInput = interaction.options.getString('birthday');
            const hobbies = interaction.options.getString('hobbies');
            const favoriteGame = interaction.options.getString('favorite_game');

            if (filter.words.includes(about)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});
            if (filter.words.includes(hobbies)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

            const userProfile = await Profile.findOne({ userId: userId });
            if (!userProfile) {
                await interaction.reply({ content: 'You **do not** have a profile yet. Please create one first.', ephemeral: true });
                return;
            }

            const updateData = {};
            if (favoriteSong) updateData.favoriteSong = favoriteSong;
            if (about) updateData.about = about;
            if (hobbies) updateData.hobbies = hobbies;
            if (favoriteGame) updateData.favoriteGame = favoriteGame;

            if (birthdayInput) {
                const birthday = moment(birthdayInput, 'YYYY-MM-DD', true);
                if (!birthday.isValid()) {
                    await interaction.reply({ content: 'Invalid birthday format. Please use YYYY-MM-DD.', ephemeral: true });
                    return;
                }
                updateData.birthday = birthday.toDate();
            }

            try {
                await Profile.updateOne({ userId: userId }, { $set: updateData });
                await interaction.reply({ content: 'Your profile has been updated!', ephemeral: true });
            } catch (error) {
                console.error("Error updating MongoDB", error);
                await interaction.reply({ content: 'There was an error updating your profile. Please try again later.', ephemeral: true });
            }

            break;
            case 'view':

            const user = interaction.options.getUser('user') || interaction.user;
        
            const viewUserProfile = await Profile.findOne({ userId: user.id });

            if (!viewUserProfile) {
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
                { name: '🎵 Favorite Song', value: `\`\`\`${viewUserProfile.favoriteSong || 'Not set'}\`\`\``, inline: true },
                { name: '📖 About', value: `\`\`\`${viewUserProfile.about || 'Not set'}\`\`\``, inline: true })

            if (viewUserProfile.birthday) {
                const now = moment();
                let nextBirthday = moment(viewUserProfile.birthday).year(now.year());
                if (nextBirthday.isBefore(now, 'day')) {
                    nextBirthday.add(1, 'year');
                }
                const daysUntilBirthday = nextBirthday.diff(now, 'days');
                profileEmbed.addFields({ name: '🎉 Next Birthday', value: `\`\`\`In ${daysUntilBirthday} day(s)\`\`\``, inline: true });
            }

            if (viewUserProfile.hobbies) {
                profileEmbed.addFields({ name: '🎈 Hobbies', value: `\`\`\`${viewUserProfile.hobbies || 'Not set'}\`\`\``, inline: true });
            }

            if (viewUserProfile.favoriteGame) {
                profileEmbed.addFields({ name: '🎮 Favorite Game', value: `\`\`\`${viewUserProfile.favoriteGame || 'Not set'}\`\`\``, inline: true });
            }

            profileEmbed
                .setFooter({ text: `Profile ID: ${viewUserProfile._id}` })
                .setTimestamp(new Date(viewUserProfile.createdAt));

            await interaction.reply({ embeds: [profileEmbed] });

            break;
        }
    }
};
