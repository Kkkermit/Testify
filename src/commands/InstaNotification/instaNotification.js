const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const InstagramSchema = require('../../schemas/instaNotificationSystem');
const fetch = require('node-fetch');
const { color, getTimestamp } = require('../../utils/loggingEffects');

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithRetry(url, options, maxRetries = 2) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                options.headers['User-Agent'] = getRandomUserAgent();
            }
            
            return await fetch(url, options);
        } catch (error) {
            lastError = error;
        }
    }
    
    throw lastError;
}

async function validateInstagramUser(username) {
    try {
        const encodedUsername = encodeURIComponent(username);
        const apiUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodedUsername}`;

        const headers = {
            'User-Agent': getRandomUserAgent(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': `https://www.instagram.com/${username}/`,
            'Origin': 'https://www.instagram.com',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
        };
        
        const response = await fetchWithRetry(apiUrl, { headers });
        
        if (!response.ok) {
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] Failed to validate user ${username}: Status ${response.status}${color.reset}`);
            return false;
        }
        
        const data = await response.json();
        
        if (!data?.data?.user) {
            console.error(`${color.yellow}[${getTimestamp()}] [INSTA_NOTIFICATION] User ${username} not found or private${color.reset}`);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error validating Instagram user ${username}: ${color.reset}`, error);
        return false;
    }
}

module.exports = {
    usableInDms: false,
    category: 'Instagram',
    permissions: [PermissionFlagsBits.ManageGuild],
    data: new SlashCommandBuilder()
    .setName('insta-notification')
    .setDescription('Manage Instagram notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand => subcommand.setName('add-user').setDescription('Add an Instagram user to track').addStringOption(option => option.setName('username').setDescription('The Instagram username to track').setRequired(true)).addChannelOption(option => option.setName('channel').setDescription('The channel to send notifications to').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('delete-user').setDescription('Remove an Instagram user from tracking').addStringOption(option => option.setName('username').setDescription('The Instagram username to stop tracking').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('check').setDescription('Check which Instagram users are being tracked')),
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add-user': {
                const username = interaction.options.getString('username');
                const channel = interaction.options.getChannel('channel');

                try {
                    const isValid = await validateInstagramUser(username);
                    if (!isValid) {
                        return await interaction.editReply({
                            content: `The Instagram username '${username}' does not exist or is not accessible. Double check the username and try again!`
                        });
                    }

                    let data = await InstagramSchema.findOne({ Guild: interaction.guild.id });
                    
                    if (!data) {
                        data = new InstagramSchema({
                            Guild: interaction.guild.id,
                            Channel: channel.id,
                            InstagramUsers: [username]
                        });
                    } else {
                        if (data.InstagramUsers.includes(username)) {
                            return await interaction.editReply({
                                content: 'This Instagram user is already being tracked!'
                            });
                        }
                        data.InstagramUsers.push(username);
                    }

                    await data.save();

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `Instagram Notification Tool ${client.config.devBy}` })
                        .setColor(client.config.embedInsta)
                        .setTitle(`${client.user.username} Instagram Notification Setup ${client.config.arrowEmoji}`)
                        .setDescription(`> Now tracking posts from: **${username}**\nNotifications will be sent to: ${channel}`)
                        .setFooter({ text: `Now tracking ${data.InstagramUsers.length} Instagram users` })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error while setting up instagram notifications ${color.reset}`, error);
                    await interaction.editReply({
                        content: 'There was an error while setting up the Instagram notifications!'
                    });
                }
                break;
            }

            case 'delete-user': {
                const username = interaction.options.getString('username');

                try {
                    const data = await InstagramSchema.findOne({ Guild: interaction.guild.id });

                    if (!data || !data.InstagramUsers.includes(username)) {
                        return await interaction.editReply({
                            content: 'This Instagram user is not being tracked! Double check the username and try again.'
                        });
                    }

                    data.InstagramUsers = data.InstagramUsers.filter(user => user !== username);
                    await data.save();

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `Instagram Notification Tool ${client.config.devBy}` })
                        .setColor(client.config.embedInsta)
                        .setTitle(`${client.user.username} Instagram Notification Removed ${client.config.arrowEmoji}`)
                        .setDescription(`> Stopped tracking posts from: **${username}**`)
                        .setFooter({ text: `Now tracking ${data.InstagramUsers.length} Instagram users`})
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error while removing instagram notifications ${color.reset}`, error);
                    await interaction.editReply({
                        content: 'There was an error while removing the Instagram notifications!'
                    });
                }
                break;
            }

            case 'check': {
                try {
                    const data = await InstagramSchema.findOne({ Guild: interaction.guild.id });

                    if (!data || data.InstagramUsers.length === 0) {
                        return await interaction.editReply({
                            content: 'No Instagram users are being tracked in this server!'
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: `Instagram Notification Tool ${client.config.devBy}` })
                        .setColor(client.config.embedInsta)
                        .setTitle(`${client.user.username} Instagram Notification Check Tracker Users ${client.config.arrowEmoji}`)
                        .setDescription(`**Tracked Users:**\n${data.InstagramUsers.map(user => `• ${user}`).join('\n')}\n\n**Notification Channel:** <#${data.Channel}>`)
                        .setFooter({ text: `Tracking ${data.InstagramUsers.length} Instagram users` })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}] [INSTA_NOTIFICATION] Error while checking instagram notifications ${color.reset}`, error);
                    await interaction.editReply({
                        content: 'There was an error while checking Instagram notifications!'
                    });
                }
                break;
            }
        }
    }
};