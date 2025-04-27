const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const axios = require('axios');

let cardCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 3600000;

module.exports = {
    usableInDms: true,
    category: "Community",
    data: new SlashCommandBuilder()
    .setName('clash-royale')
    .setDescription('Get information about Clash Royale players and clans')
    .addSubcommand(subcommand => subcommand.setName('player').setDescription('Get information about a Clash Royale player').addStringOption(option => option.setName('player-tag').setDescription('The player tag (e.g. #20022JR28)').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('clan-info').setDescription('Get information about a Clash Royale clan').addStringOption(option => option.setName('clan-tag').setDescription('The clan tag (e.g. #QPP0VPCR)').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('card-info').setDescription('Get information about a specific Clash Royale card').addStringOption(option => option.setName('card-name').setDescription('Name of the card you want to look up').setAutocomplete(true).setRequired(true))),                
    async autocomplete(interaction, client) {
        if (interaction.options.getSubcommand() === 'card-info') {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            try {
                const cards = await getCardData();
                
                let filtered = cards.filter(card => 
                    card.name.toLowerCase().includes(focusedValue)
                );
                
                filtered.sort((a, b) => {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    
                    if (aName === focusedValue && bName !== focusedValue) return -1;
                    if (bName === focusedValue && aName !== focusedValue) return 1;
                    
                    if (aName.startsWith(focusedValue) && !bName.startsWith(focusedValue)) return -1;
                    if (bName.startsWith(focusedValue) && !aName.startsWith(focusedValue)) return 1;
                    
                    return aName.localeCompare(bName);
                });
                
                filtered = filtered.slice(0, 25);
                
                await interaction.respond(
                    filtered.map(card => ({
                        name: card.name,
                        value: card.name
                    }))
                );
            } catch (error) {
                console.error('Error during card autocomplete:', error);
                await interaction.respond([]);
            }
        }
    },
    
    async execute(interaction, client) {
        await interaction.deferReply();
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'player') {
            await handlePlayerCommand(interaction, client);
        } else if (subcommand === 'clan-info') {
            await handleClanCommand(interaction, client);
        } else if (subcommand === 'card-info') {
            await handleCardCommand(interaction, client);
        }
    }
};

async function getCardData() {
    const currentTime = Date.now();
    
    if (cardCache && (currentTime - lastCacheTime < CACHE_DURATION)) {
        return cardCache;
    }
    
    try {
        const response = await axios.get(`https://api.clashroyale.com/v1/cards`, {
            headers: {
                'Authorization': `Bearer ${process.env.CLASH_ROYAL_API_KEY}`
            }
        });
        
        const allCards = [...response.data.items];
        
        if (response.data.supportItems && response.data.supportItems.length > 0) {
            allCards.push(...response.data.supportItems);
        }
        
        cardCache = allCards;
        lastCacheTime = currentTime;
        
        return allCards;
    } catch (error) {
        console.error('Error fetching card data:', error);
        return cardCache || [];
    }
}

async function handleCardCommand(interaction, client) {
    const cardName = interaction.options.getString('card-name');
    
    try {
        const cards = await getCardData();
        
        const card = cards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
        
        if (!card) {
            return interaction.editReply({
                content: `Couldn't find a card named "${cardName}". Please check the spelling and try again.`,
                flags: MessageFlags.Ephemeral
            });
        }
        
        const cardEmbed = createCardEmbed(card, client);
        
        let cardImage = null;
        
        if (card.iconUrls && (card.iconUrls.medium || card.iconUrls.evolutionMedium)) {
            try {
                const imageUrl = card.iconUrls.evolutionMedium || card.iconUrls.medium;
                
                const cardVisual = await createCardVisual(card, imageUrl);
                cardImage = new AttachmentBuilder(cardVisual, { name: 'card.png' });
                
                cardEmbed.setImage('attachment://card.png');
            } catch (imageError) {
                console.error('Error creating card image:', imageError);
            }
        }
        
        if (cardImage) {
            await interaction.editReply({
                embeds: [cardEmbed],
                files: [cardImage]
            });
        } else {
            await interaction.editReply({
                embeds: [cardEmbed]
            });
        }
        
    } catch (error) {
        console.error('Error fetching card info:', error);
        
        if (error.response && error.response.status === 403) {
            return interaction.editReply({
                content: "API key invalid or expired. Please contact the bot owner to update the API key.",
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.editReply({ 
            content: 'An error occurred while fetching card data. Please try again later.',
            flags: MessageFlags.Ephemeral
        });
    }
}

function createCardEmbed(card, client) {
    const rarityColor = getRarityColor(card.rarity);
    
    const elixirCost = card.elixirCost !== undefined ? `${card.elixirCost} ⚡` : 'N/A';
    
    const rarity = card.rarity ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) : 'N/A';
    
    const embed = new EmbedBuilder()
        .setColor(rarityColor)
        .setAuthor({ name: `Clash Royale Card Info ${client.config.devBy}` })
        .setTitle(card.name)
        .setDescription(`> ${rarity} Card`)
        .addFields(
            { name: '⚡ Elixir Cost', value: elixirCost, inline: true },
            { name: '⬆️ Max Level', value: card.maxLevel?.toString() || 'N/A', inline: true }
        )
        .setFooter({ text: 'Clash Royale API', iconURL: 'https://play-lh.googleusercontent.com/rIvZQ_H3hfmexC8vurmLczLtMNBFtxCEdmb2NwkSPz2ZuJJ5nRPD0HbSJ7YTyFGdADQ' })
        .setTimestamp();
    
    if (card.maxEvolutionLevel) {
        embed.addFields({ name: '✨ Max Evolution Level', value: card.maxEvolutionLevel.toString(), inline: true });
    }
    
    if (card.id) {
        embed.addFields({ name: '🔢 Card ID', value: card.id.toString(), inline: true });
    }
    
    if (card.iconUrls && card.iconUrls.medium) {
        embed.setThumbnail(card.iconUrls.medium);
    }
    
    return embed;
}

async function createCardVisual(card, imageUrl) {
    const canvas = createCanvas(300, 450);
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 450);
    const rarityColor = getCardRarityColor(card.rarity);
    gradient.addColorStop(0, rarityColor);
    gradient.addColorStop(1, '#2C2F33');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    try {
        const image = await loadImage(imageUrl);
        
        const imageSize = Math.min(canvas.width - 40, 260);
        const x = (canvas.width - imageSize) / 2;
        const y = 50;
        ctx.drawImage(image, x, y, imageSize, imageSize);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(card.name, canvas.width / 2, 35);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText(card.rarity?.charAt(0).toUpperCase() + card.rarity?.slice(1) || 'Unknown', canvas.width / 2, 350);
        
        if (card.elixirCost !== undefined) {
            ctx.fillStyle = '#7B68EE';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 390, 25, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#9370DB';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 385, 22, 0, Math.PI, true);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(card.elixirCost.toString(), canvas.width / 2, 400);
        }
    } catch (error) {
        console.error('Error creating card visual:', error);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(card.name, canvas.width / 2, 35);
        
        ctx.fillStyle = '#999999';
        ctx.fillRect(50, 60, 200, 200);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Image not available', canvas.width / 2, 160);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText(card.rarity?.charAt(0).toUpperCase() + card.rarity?.slice(1) || 'Unknown', canvas.width / 2, 350);
    }
    
    return canvas.toBuffer();
}

function getRarityColor(rarity) {
    switch(rarity?.toLowerCase()) {
        case 'common': return '#BDBDBD';
        case 'rare': return '#F9A825';
        case 'epic': return '#9C27B0';
        case 'legendary': return '#F44336';
        case 'champion': return '#2196F3';
        default: return '#455A64';
    }
}

async function handlePlayerCommand(interaction, client) {
    let playerTag = interaction.options.getString('player-tag');
    
    if (!playerTag.startsWith('#')) {
        playerTag = '#' + playerTag;
    }
    
    try {
        const encodedTag = encodeURIComponent(playerTag);
        
        const response = await axios.get(`https://api.clashroyale.com/v1/players/${encodedTag}`, {
            headers: {
                'Authorization': `Bearer ${process.env.CLASH_ROYAL_API_KEY}`
            }
        });
        
        const playerData = response.data;
        
        const deckImage = await createDeckImage(playerData.currentDeck);
        const attachmentDeck = new AttachmentBuilder(deckImage, { name: 'deck.png' });
        
        const mainEmbed = createMainEmbed(playerData, client);
        
        const statsEmbed = createStatsEmbed(playerData, client);
        
        let clanEmbed = null;
        if (playerData.clan) {
            clanEmbed = createClanEmbed(playerData, client);
        }
        
        const battleEmbed = createBattleStatsEmbed(playerData, client);
        
        const achievementsEmbed = createAchievementsEmbed(playerData, client);
        
        const embeds = [mainEmbed, statsEmbed, battleEmbed];
        
        if (clanEmbed) embeds.push(clanEmbed);
        
        if (achievementsEmbed) embeds.push(achievementsEmbed);
        
        await interaction.editReply({
            embeds: embeds.slice(0, 10),
            files: [attachmentDeck]
        });
        
    } catch (error) {
        console.error('Error fetching Clash Royale player data:', error);
        
        if (error.response && error.response.status === 404) {
            return interaction.editReply({ 
                content: `Player with tag ${playerTag} not found. Please check the tag and try again.`,
                flags: MessageFlags.Ephemeral
            });
        } else if (error.response && error.response.status === 403) {
            return interaction.editReply({
                content: "API key invalid or expired. Please contact the bot owner to update the API key.",
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.editReply({ 
            content: 'An error occurred while fetching player data. Please try again later.',
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleClanCommand(interaction, client) {
    let clanTag = interaction.options.getString('clan-tag');
    
    if (!clanTag.startsWith('#')) {
        clanTag = '#' + clanTag;
    }
    
    try {
        const encodedTag = encodeURIComponent(clanTag);
        
        const response = await axios.get(`https://api.clashroyale.com/v1/clans/${encodedTag}`, {
            headers: {
                'Authorization': `Bearer ${process.env.CLASH_ROYAL_API_KEY}`
            }
        });
        
        const clanData = response.data;
        
        const clanOverviewEmbed = createClanOverviewEmbed(clanData, client);
        
        const clanStatsEmbed = createClanStatsEmbed(clanData, client);
        
        const topMembersEmbed = createTopMembersEmbed(clanData, client);
        
        const clanActivityEmbed = createClanActivityEmbed(clanData, client);
        
        await interaction.editReply({
            embeds: [clanOverviewEmbed, clanStatsEmbed, topMembersEmbed, clanActivityEmbed]
        });
        
    } catch (error) {
        console.error('Error fetching Clash Royale clan data:', error);
        
        if (error.response && error.response.status === 404) {
            return interaction.editReply({ 
                content: `Clan with tag ${clanTag} not found. Please check the tag and try again.`,
                flags: MessageFlags.Ephemeral
            });
        } else if (error.response && error.response.status === 403) {
            return interaction.editReply({
                content: "API key invalid or expired. Please contact the bot owner to update the API key.",
                flags: MessageFlags.Ephemeral
            });
        }
        
        await interaction.editReply({ 
            content: 'An error occurred while fetching clan data. Please try again later.',
            flags: MessageFlags.Ephemeral
        });
    }
}

function createClanOverviewEmbed(clanData, client) {
    let locationText = 'Not specified';
    if (clanData.location) {
        locationText = clanData.location.name;
        if (clanData.location.isCountry && clanData.location.countryCode) {
            locationText += ` :flag_${clanData.location.countryCode.toLowerCase()}:`;
        }
    }
    
    const typeMap = {
        'open': '🔓 Open',
        'invite_only': '✉️ Invite Only',
        'closed': '🔒 Closed'
    };
    const clanType = typeMap[clanData.type.toLowerCase()] || clanData.type;
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setAuthor({ name: `Clash Royale Clan Info ${client.config.devBy}` })
        .setTitle(`${clanData.name} (${clanData.tag})`)
        .setDescription(clanData.description || 'No description')
        .addFields(
            { name: '👑 Type', value: clanType, inline: true },
            { name: '🌎 Location', value: locationText, inline: true },
            { name: '👥 Members', value: `${clanData.members}/50`, inline: true },
            { name: '🏆 Required Trophies', value: clanData.requiredTrophies.toString(), inline: true },
            { name: '🏆 Clan Score', value: clanData.clanScore.toString(), inline: true },
            { name: '⚔️ War Trophies', value: clanData.clanWarTrophies?.toString() || '0', inline: true }
        )
        .setFooter({ text: 'Clash Royale API', iconURL: 'https://play-lh.googleusercontent.com/rIvZQ_H3hfmexC8vurmLczLtMNBFtxCEdmb2NwkSPz2ZuJJ5nRPD0HbSJ7YTyFGdADQ' })
        .setTimestamp();
    
    if (clanData.badgeUrls && clanData.badgeUrls.medium) {
        embed.setThumbnail(clanData.badgeUrls.medium);
    }
    
    return embed;
}

function createClanStatsEmbed(clanData, client) {
    const chestStatusMap = {
        'inactive': '⚪ Inactive',
        'active': '🔵 Active',
        'completed': '✅ Completed',
        'unknown': '❓ Unknown'
    };
    const chestStatus = chestStatusMap[clanData.clanChestStatus?.toLowerCase()] || '❓ Unknown';
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('📊 Clan Statistics')
        .addFields(
            { name: '💰 Donations per Week', value: clanData.donationsPerWeek?.toString() || '0', inline: true },
            { name: '📦 Clan Chest Status', value: chestStatus, inline: true },
            { name: '📦 Clan Chest Level', value: `${clanData.clanChestLevel || 0}/${clanData.clanChestMaxLevel || 0}`, inline: true }
        );
    
    if (clanData.clanChestPoints) {
        embed.addFields({ name: '🎮 Clan Chest Points', value: clanData.clanChestPoints.toString(), inline: true });
    }
    
    return embed;
}

function createTopMembersEmbed(clanData, client) {
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('🏆 Top Clan Members');
    
    const topMembers = clanData.memberList
        .sort((a, b) => b.trophies - a.trophies)
        .slice(0, 10);
    
    const getRoleEmoji = (role) => {
        switch(role?.toLowerCase()) {
            case 'leader': return '👑 ';
            case 'coleader': return '⭐ ';
            case 'admin': 
            case 'elder': return '🔰 ';
            default: return '👤 ';
        }
    };
    
    if (topMembers.length > 0) {
        const membersText = topMembers.map((member, index) => {
            const roleEmoji = getRoleEmoji(member.role);
            return `**${index + 1}.** ${roleEmoji}**${member.name}** • ${member.trophies} 🏆`;
        }).join('\n');
        
        embed.setDescription(membersText);
    } else {
        embed.setDescription('No member data available');
    }
    
    return embed;
}

function createClanActivityEmbed(clanData, client) {
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('🎮 Clan Activity');
    
    const topDonors = [...clanData.memberList]
        .sort((a, b) => b.donations - a.donations)
        .slice(0, 5);
    
    const topReceivers = [...clanData.memberList]
        .sort((a, b) => b.donationsReceived - a.donationsReceived)
        .slice(0, 5);
    
    if (topDonors.length > 0) {
        const donorsText = topDonors
            .map((member, index) => `**${index + 1}.** **${member.name}** • ${member.donations} donations`)
            .join('\n');
        
        embed.addFields({ name: '🎁 Top Donors', value: donorsText || 'No donation data', inline: false });
    }
    
    if (topReceivers.length > 0) {
        const receiversText = topReceivers
            .map((member, index) => `**${index + 1}.** **${member.name}** • ${member.donationsReceived} received`)
            .join('\n');
        
        embed.addFields({ name: '📩 Top Receivers', value: receiversText || 'No donation data', inline: false });
    }
    
    const recentlyActive = [...clanData.memberList]
        .sort((a, b) => {
            if (!a.lastSeen) return 1;
            if (!b.lastSeen) return -1;
            return b.lastSeen.localeCompare(a.lastSeen);
        })
        .slice(0, 5);
    
    if (recentlyActive.length > 0) {
        const formatLastSeen = (timestamp) => {
            if (!timestamp) return 'Unknown';
            
            try {
                const regex = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})Z$/;
                const match = timestamp.match(regex);
                
                if (match) {
                    const isoTimestamp = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.${match[7]}Z`;
                    const date = new Date(isoTimestamp);
                    
                    if (!isNaN(date.getTime())) {
                        const now = new Date();
                        if (date.getFullYear() > now.getFullYear() + 1) {
                            const options = { year: 'numeric', month: 'short', day: 'numeric' };
                            return date.toLocaleDateString(undefined, options);
                        } else {
                            return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
                        }
                    }
                }
                
                return timestamp;
            } catch (e) {
                console.error("Error formatting timestamp:", e);
                return timestamp;
            }
        };
        
        const activeText = recentlyActive
            .map((member) => `**${member.name}** • Last seen: ${formatLastSeen(member.lastSeen)}`)
            .join('\n');
        
        embed.addFields({ name: '🕒 Recent Activity', value: activeText || 'No activity data', inline: false });
    }
    
    return embed;
}

function createMainEmbed(playerData, client) {
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setAuthor({ name: `Clash Royale Player Stats ${client.config.devBy}` })
        .setTitle(`${playerData.name} (${playerData.tag})`)
        .setThumbnail('https://static.wikia.nocookie.net/clashroyale/images/b/b2/League8.png/revision/latest?cb=20170317224348')
        .setDescription(`> Player statistics for **${playerData.name}**`)
        .addFields(
            { name: '👑 Experience', value: `Level ${playerData.expLevel}`, inline: true },
            { name: '🏆 Trophies', value: `${playerData.trophies} (Best: ${playerData.bestTrophies})`, inline: true },
            { name: '🏅 Arena', value: playerData.arena ? playerData.arena.name : 'Unknown', inline: true }
        )
        .setImage('attachment://deck.png')
        .setFooter({ text: 'Clash Royale API', iconURL: 'https://play-lh.googleusercontent.com/rIvZQ_H3hfmexC8vurmLczLtMNBFtxCEdmb2NwkSPz2ZuJJ5nRPD0HbSJ7YTyFGdADQ' })
        .setTimestamp();
        
    return embed;
}

function createStatsEmbed(playerData, client) {
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('📊 Player Statistics')
        .addFields(
            { name: '⚡ Current Deck Average Elixir', value: calculateAverageElixir(playerData.currentDeck).toString(), inline: true },
            { name: '💰 Star Points', value: playerData.starPoints?.toString() || '0', inline: true },
            { name: '🏆 Legacy Trophy Road', value: playerData.legacyTrophyRoadHighScore?.toString() || '0', inline: true },
            { name: '💰 Donations', value: `Given: ${playerData.totalDonations || 0}\nReceived: ${playerData.donationsReceived || 0}`, inline: true },
            { name: '🎮 Total Battles', value: playerData.battleCount?.toString() || '0', inline: true },
            { name: '🎯 Cards Collected', value: playerData.clanCardsCollected?.toString() || '0', inline: true }
        );
        
    if (playerData.leagueStatistics) {
        const leagueStats = playerData.leagueStatistics;
        let leagueText = '';
        
        if (leagueStats.currentSeason) {
            leagueText += `Current: ${leagueStats.currentSeason.trophies || 0} 🏆\n`;
        }
        
        if (leagueStats.previousSeason) {
            leagueText += `Previous: ${leagueStats.previousSeason.trophies || 0} 🏆\n`;
        }
        
        if (leagueStats.bestSeason) {
            leagueText += `Best: ${leagueStats.bestSeason.trophies || 0} 🏆`;
        }
        
        embed.addFields({ name: '🏅 League Statistics', value: leagueText || 'No league data', inline: false });
    }
    
    if (playerData.currentFavouriteCard) {
        embed.addFields({ 
            name: '❤️ Favorite Card', 
            value: playerData.currentFavouriteCard.name || 'Unknown', 
            inline: true 
        });
    }
    
    return embed;
}

function createClanEmbed(playerData, client) {
    if (!playerData.clan) return null;
    
    const clan = playerData.clan;
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('👥 Clan Information')
        .addFields(
            { name: '🛡️ Clan Name', value: clan.name || 'Unknown', inline: true },
            { name: '🏷️ Clan Tag', value: clan.tag || 'Unknown', inline: true },
            { name: '👤 Role', value: playerData.role?.charAt(0).toUpperCase() + playerData.role?.slice(1).toLowerCase() || 'Unknown', inline: true }
        );
        
    return embed;
}

function createBattleStatsEmbed(playerData, client) {
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('⚔️ Battle Statistics')
        .addFields(
            { name: '🏆 Wins', value: playerData.wins?.toString() || '0', inline: true },
            { name: '❌ Losses', value: playerData.losses?.toString() || '0', inline: true },
            { name: '📊 Win Rate', value: `${calculateWinRate(playerData.wins, playerData.losses)}%`, inline: true },
            { name: '👑 Three Crown Wins', value: playerData.threeCrownWins?.toString() || '0', inline: true },
            { name: '🏆 Challenge Max Wins', value: playerData.challengeMaxWins?.toString() || '0', inline: true },
            { name: '🎲 Challenge Cards Won', value: playerData.challengeCardsWon?.toString() || '0', inline: true },
            { name: '🏟️ Tournament Cards Won', value: playerData.tournamentCardsWon?.toString() || '0', inline: true },
            { name: '⚡ Tournament Battles', value: playerData.tournamentBattleCount?.toString() || '0', inline: true },
            { name: '⚔️ War Day Wins', value: playerData.warDayWins?.toString() || '0' }
        );
        
    return embed;
}

function createAchievementsEmbed(playerData, client) {
    if (!playerData.achievements || playerData.achievements.length === 0) return null;
    
    const embed = new EmbedBuilder()
        .setColor(client.config.embedCommunity)
        .setTitle('🏆 Achievements');
        
    const achievements = playerData.achievements.slice(0, 10);
    achievements.forEach(achievement => {
        embed.addFields({
            name: `${achievement.name}${achievement.stars ? ` (${'⭐'.repeat(achievement.stars)})` : ''}`,
            value: `Progress: ${achievement.value || 0}/${achievement.target || 0}`,
            inline: true
        });
    });
    
    return embed;
}

async function createDeckImage(deck) {
    const canvas = createCanvas(800, 430);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Current Deck', 20, 35);
    
    const avgElixir = calculateAverageElixir(deck);
    ctx.fillText(`Average Elixir: ${avgElixir}`, 550, 35);
    
    try {
        const cardWidth = 130;
        const cardHeight = 160;
        const horizontalPadding = 30;
        const verticalPadding = 30;
        const startX = 50;
        const startY = 60;
        
        for (let i = 0; i < Math.min(deck.length, 8); i++) {
            try {
                const row = Math.floor(i / 4);
                const col = i % 4;
                
                const x = col * (cardWidth + horizontalPadding) + startX;
                const y = row * (cardHeight + verticalPadding) + startY;
                
                ctx.fillStyle = getCardRarityColor(deck[i].rarity);
                
                roundRect(ctx, x, y, cardWidth, cardHeight, 8, true, false);
                
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                roundRect(ctx, x, y, cardWidth, cardHeight, 8, false, true);
                
                if (deck[i].iconUrls && deck[i].iconUrls.medium) {
                    try {
                        const image = await loadImage(deck[i].iconUrls.medium);
                        
                        const imageSize = cardWidth - 20;
                        
                        const imageX = x + (cardWidth - imageSize) / 2;
                        const imageY = y + 10;
                        
                        ctx.drawImage(image, imageX, imageY, imageSize, imageSize);
                    } catch (error) {
                        console.error(`Error loading card image for ${deck[i].name}:`, error);
                        
                        ctx.fillStyle = '#555555';
                        ctx.fillRect(x + 15, y + 15, cardWidth - 30, cardWidth - 30);
                        ctx.fillStyle = '#FFFFFF';
                        ctx.textAlign = 'center';
                        ctx.fillText('No Image', x + cardWidth/2, y + cardWidth/2);
                        ctx.textAlign = 'left';
                    }
                }
                
                if (deck[i].name) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 14px Arial';
                    
                    let cardName = deck[i].name;
                    if (cardName.length > 15) {
                        cardName = cardName.substring(0, 13) + '...';
                    }
                    
                    ctx.textAlign = 'center';
                    ctx.fillText(cardName, x + cardWidth / 2, y + cardWidth + 5);
                    ctx.textAlign = 'left';
                }
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 14px Arial';
                ctx.fillText(`Level ${deck[i].level}`, x + 10, y + cardHeight - 10);
                
                ctx.fillStyle = '#7B68EE';
                ctx.beginPath();
                ctx.arc(x + cardWidth - 18, y + 18, 16, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#9370DB';
                ctx.beginPath();
                ctx.arc(x + cardWidth - 18, y + 16, 14, 0, Math.PI, true);
                ctx.fill();
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(deck[i].elixirCost.toString(), x + cardWidth - 18, y + 22);
                ctx.textAlign = 'left';
                
            } catch (error) {
                console.error(`Error drawing card ${i}:`, error);
            }
        }
        
    } catch (error) {
        console.error('Error creating deck image:', error);
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('Error rendering deck image', canvas.width/2 - 150, canvas.height/2);
    }
    
    return canvas.toBuffer();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        const defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (let side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
}

function calculateAverageElixir(deck) {
    if (!deck || !deck.length) return 0;
    
    const sum = deck.reduce((acc, card) => acc + (card.elixirCost || 0), 0);
    return (sum / deck.length).toFixed(1);
}

function calculateWinRate(wins, losses) {
    if (!wins && !losses) return "0.0";
    
    const totalGames = (wins || 0) + (losses || 0);
    if (totalGames === 0) return "0.0";
    
    return ((wins / totalGames) * 100).toFixed(1);
}

function getCardRarityColor(rarity) {
    switch(rarity?.toLowerCase()) {
        case 'common': return '#BDBDBD';
        case 'rare': return '#F9A825';
        case 'epic': return '#8E24AA';
        case 'legendary': return '#B71C1C';
        default: return '#455A64';
    }
}
