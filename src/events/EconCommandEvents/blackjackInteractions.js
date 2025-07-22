const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('blackjack_')) return;
        
        if (!client.blackjackGames) client.blackjackGames = new Map();
        
        if (!client.blackjackGames.has(interaction.user.id)) {
            return interaction.reply({
                content: "You don't have an active blackjack game. Start a new game with `/gamble blackjack`.",
                ephemeral: true
            });
        }
        
        const game = client.blackjackGames.get(interaction.user.id);
        
        try {
            const userData = await economySchema.findOne({ 
                Guild: game.guildId, 
                User: game.userId 
            });
            
            if (!userData) {
                return interaction.reply({
                    content: "Your economy account seems to have been deleted during the game.",
                    ephemeral: true
                });
            }
            
            if (interaction.customId === 'blackjack_hit') {
                if (game.stage !== 'player_turn') {
                    return interaction.reply({
                        content: "It's not your turn anymore.",
                        ephemeral: true
                    });
                }
                
                const newCard = drawCard(game.deck);
                game.playerHand.push(newCard);
                
                const playerValue = calculateHandValue(game.playerHand);
                
                if (playerValue > 21) {
                    game.stage = 'game_over';
                    
                    const embed = createBlackjackEmbed(
                        interaction, 
                        game.playerHand, 
                        game.dealerHand, 
                        -game.betAmount, 
                        userData.Wallet, 
                        'bust'
                    );
                    
                    client.blackjackGames.delete(interaction.user.id);
                    
                    return interaction.update({ 
                        embeds: [embed], 
                        components: [] 
                    });
                    
                } else if (playerValue === 21) {
                    game.stage = 'dealer_turn';
                    
                    return handleDealerTurn(interaction, client, game, userData);
                    
                } else {
                    const embed = createBlackjackEmbed(
                        interaction, 
                        game.playerHand, 
                        [game.dealerHand[0], {rank: '?', suit: '?'}], 
                        0, 
                        userData.Wallet, 
                        'in_progress'
                    );
                    
                    const buttons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('blackjack_hit')
                            .setLabel('Hit')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🃏'),
                        new ButtonBuilder()
                            .setCustomId('blackjack_stand')
                            .setLabel('Stand')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('🛑')
                    );
                    
                    return interaction.update({ 
                        embeds: [embed], 
                        components: [buttons] 
                    });
                }
                
            } else if (interaction.customId === 'blackjack_stand') {
                if (game.stage !== 'player_turn') {
                    return interaction.reply({
                        content: "It's not your turn anymore.",
                        ephemeral: true
                    });
                }
                
                game.stage = 'dealer_turn';
                return handleDealerTurn(interaction, client, game, userData);
            }
            
        } catch (error) {
            client.logs.error("Blackjack interaction error:", error);

            client.blackjackGames.delete(interaction.user.id);
            
            return interaction.reply({
                content: "An error occurred during the blackjack game. Your game has been canceled.",
                ephemeral: true
            });
        }
    }
};

async function handleDealerTurn(interaction, client, game, userData) {

    let dealerValue = calculateHandValue(game.dealerHand);

    while (dealerValue < 17) {
        game.dealerHand.push(drawCard(game.deck));
        dealerValue = calculateHandValue(game.dealerHand);
    }
    
    const playerValue = calculateHandValue(game.playerHand);
    let status, profit;
    
    if (dealerValue > 21) {
        status = 'dealer_bust';
        profit = game.betAmount;
        userData.Wallet += (game.betAmount * 2); 
    } else if (dealerValue > playerValue) {
        status = 'lose';
        profit = -game.betAmount;
    } else if (dealerValue < playerValue) {
        status = 'win';
        profit = game.betAmount;
        userData.Wallet += (game.betAmount * 2); 
    } else {
        status = 'push';
        profit = 0;
        userData.Wallet += game.betAmount; 
    }

    await userData.save();

    const embed = createBlackjackEmbed(
        interaction, 
        game.playerHand, 
        game.dealerHand, 
        profit, 
        userData.Wallet, 
        status
    );

    client.blackjackGames.delete(interaction.user.id);
    
    return interaction.update({ 
        embeds: [embed], 
        components: [] 
    });
}

function drawCard(deck) {
    return deck.pop();
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
        if (card.rank === '?') continue; 
        
        if (card.rank === 'A') {
            value += 11;
            aces++;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    
    return value;
}

function createBlackjackEmbed(interaction, playerHand, dealerHand, profit, newBalance, status) {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    const formatHand = (hand) => hand.map(card => `${card.rank}${card.suit}`).join(' ');
    const playerHandStr = formatHand(playerHand);
    const dealerHandStr = formatHand(dealerHand);
    
    let color, title, description;
    
    switch(status) {
        case 'blackjack':
            color = '#FFD700'; 
            title = '🎲 Blackjack! 21!';
            description = `You got a natural blackjack and won 3:2 on your bet!`;
            break;
        case 'win':
            color = '#00FF00'; 
            title = '🎲 You Won!';
            description = `You beat the dealer!`;
            break;
        case 'lose':
            color = '#FF0000'; 
            title = '🎲 You Lost!';
            description = `The dealer beat you.`;
            break;
        case 'push':
            color = '#FFFF00'; 
            title = '🎲 Push!';
            description = `It's a tie! Your bet has been returned.`;
            break;
        case 'bust':
            color = '#FF0000'; 
            title = '🎲 Bust!';
            description = `Your hand value exceeded 21. You lost!`;
            break;
        case 'dealer_bust':
            color = '#00FF00'; 
            title = '🎲 Dealer Bust!';
            description = `The dealer's hand exceeded 21. You win!`;
            break;
        case 'in_progress':
        default:
            color = '#0099FF';
            title = '🎲 Blackjack';
            description = `Your turn! Choose "Hit" to draw another card or "Stand" to keep your current hand.`;
            break;
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setDescription(description)
        .addFields(
            { name: '👤 Your Hand', value: `${playerHandStr} (${playerValue})`, inline: false },
            { name: '🎰 Dealer\'s Hand', value: `${dealerHandStr}${status === 'in_progress' ? ' (?)' : ` (${dealerValue})`}`, inline: false }
        )
        .setFooter({ text: status === 'in_progress' ? 'Make your move!' : 'Thanks for playing!' })
        .setTimestamp();
    
    if (status !== 'in_progress') {
        embed.addFields(
            { name: '💸 Profit/Loss', value: `${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}`, inline: true },
            { name: '👛 New Balance', value: `$${newBalance.toLocaleString()}`, inline: true }
        );
    }
    
    return embed;
}
