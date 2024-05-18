const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../schemas/profileSystem');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('profile-edit')
    .setDescription('Edits your user profile.')
    .addStringOption(option => option.setName('favorite_song').setDescription('Your new favorite song').setRequired(false))
    .addStringOption(option => option.setName('about').setDescription('Something new about you').setRequired(false))
    .addStringOption(option => option.setName('birthday').setDescription('Your birthday (YYYY-MM-DD)').setRequired(false))
    .addStringOption(option => option.setName('hobbies').setDescription('Your new hobbies').setRequired(false))
    .addStringOption(option => option.setName('favorite_game').setDescription('Your new favorite game').setRequired(false)),
    async execute(interaction, client) {

        const userId = interaction.user.id;

        const favoriteSong = interaction.options.getString('favorite_song');
        const about = interaction.options.getString('about');
        const birthdayInput = interaction.options.getString('birthday');
        const hobbies = interaction.options.getString('hobbies');
        const favoriteGame = interaction.options.getString('favorite_game');

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
    }
};
