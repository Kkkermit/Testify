const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Profile = require('../../schemas/profileSystem');
const moment = require('moment'); 

module.exports = {
    data: new SlashCommandBuilder()
    .setName('profile-create')
    .setDescription('Creates a user profile.')
    .addStringOption(option => option.setName('favorite_song').setDescription('Your favorite song').setRequired(true))
    .addStringOption(option => option.setName('about').setDescription('Something about you').setRequired(true))
    .addStringOption(option => option.setName('birthday').setDescription('Your birthday (YYYY-MM-DD)').setRequired(false))
    .addStringOption(option => option.setName('hobbies').setDescription('Your hobbies').setRequired(false))
    .addStringOption(option => option.setName('favorite_game').setDescription('Your favorite game').setRequired(false)),
    async execute(interaction, client) {

        const userId = interaction.user.id;

        const favoriteSong = interaction.options.getString('favorite_song');
        const about = interaction.options.getString('about');
        const hobbies = interaction.options.getString('hobbies') || '';
        const favoriteGame = interaction.options.getString('favorite_game') || '';

        const existingProfile = await Profile.findOne({ userId: userId });

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
            favoriteSong: favoriteSong,
            about: about,
            hobbies: hobbies,
            favoriteGame: favoriteGame,
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
    }
};
