const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

const cooldowns = new Map();

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble your money for a chance to win more')
        .addSubcommand(subcommand =>
            subcommand.setName('basic')
            .setDescription('Simple gambling with a multiplier')
            .addNumberOption(option => 
                option.setName('amount')
                .setDescription('Amount to gamble')
                .setRequired(true)
                .setMinValue(100)))
        .addSubcommand(subcommand =>
            subcommand.setName('blackjack')
            .setDescription('Play blackjack against the dealer')
            .addNumberOption(option => 
                option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(100)))
        .addSubcommand(subcommand =>
            subcommand.setName('slots')
            .setDescription('Try your luck on the slot machine')
            .addNumberOption(option => 
                option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(50)))
        .addSubcommand(subcommand =>
            subcommand.setName('roulette')
            .setDescription('Place bets on a roulette wheel')
            .addStringOption(option =>
                option.setName('bet_type')
                .setDescription('Type of bet to place')
                .setRequired(true)
                .addChoices(
                    { name: 'Red', value: 'red' },
                    { name: 'Black', value: 'black' },
                    { name: 'Even', value: 'even' },
                    { name: 'Odd', value: 'odd' },
                    { name: '1-18', value: 'low' },
                    { name: '19-36', value: 'high' }
                ))
            .addNumberOption(option => 
                option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(100))),
        
    async execute(interaction, client) {
        const { guild, user, options } = interaction;
        const subcommand = options.getSubcommand();
        
        if (cooldowns.has(user.id)) {
            const cooldownExpiration = cooldowns.get(user.id);
            const timeLeft = Math.ceil((cooldownExpiration - Date.now()) / 1000);
            
            if (timeLeft > 0) {
                return interaction.reply({
                    content: `You need to wait ${timeLeft} second${timeLeft !== 1 ? 's' : ''} before gambling again.`,
                    ephemeral: true
                });
            }
        }
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (!data) {
            return interaction.reply({
                content: "You don't have an economy account yet. Create one using `/economy create`!",
                ephemeral: true
            });
        }

        switch(subcommand) {
            case 'basic':
                return handleBasicGamble(interaction, client, data);
            case 'blackjack':
                return handleBlackjack(interaction, client, data);
            case 'slots':
                return handleSlots(interaction, client, data);
            case 'roulette':
                return handleRoulette(interaction, client, data);
        }
    }
};

async function handleBasicGamble(interaction, client, data) {
    const amount = interaction.options.getNumber('amount');

    if (amount > data.Wallet) {
        return interaction.reply({
            content: `You don't have enough money in your wallet. You only have **$${data.Wallet.toLocaleString()}**.`,
            ephemeral: true
        });
    }

    const multiplier = Math.random() * 2;
    const winnings = Math.floor(amount * multiplier);

    const isWin = winnings > amount;
    const isTie = winnings === amount;

    data.Wallet -= amount;
    data.Wallet += winnings;
    data.Gambled += 1;
    data.CommandsRan += 1;
    
    await data.save();

    cooldowns.set(interaction.user.id, Date.now() + 15000);

    let embed = new EmbedBuilder()
        .setAuthor({ name: `${interaction.user.username}'s Gamble`, iconURL: interaction.user.displayAvatarURL() })
        .setColor(isWin ? '#00FF00' : (isTie ? '#FFFF00' : '#FF0000'))
        .addFields(
            { name: '💰 Bet Amount', value: `$${amount.toLocaleString()}`, inline: true },
            { name: '🎲 Multiplier', value: `${multiplier.toFixed(2)}x`, inline: true },
            { name: '💵 Result', value: `$${winnings.toLocaleString()}`, inline: true },
            { name: '💸 Profit/Loss', value: `${isWin ? '+' : ''}$${(winnings - amount).toLocaleString()}`, inline: true },
            { name: '👛 New Balance', value: `$${data.Wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: `You can gamble again in 15 seconds` })
        .setTimestamp();
        
    if (isWin) {
        embed.setTitle('🎉 You Won!');
        embed.setDescription(`Congratulations! You bet $${amount.toLocaleString()} and won $${winnings.toLocaleString()}!`);
    } else if (isTie) {
        embed.setTitle('🤝 It\'s a Tie');
        embed.setDescription(`You bet $${amount.toLocaleString()} and got exactly your money back.`);
    } else {
        embed.setTitle('😢 You Lost');
        embed.setDescription(`You bet $${amount.toLocaleString()} and lost $${(amount - winnings).toLocaleString()}.`);
    }
    
    return interaction.reply({ embeds: [embed] });
}

async function handleBlackjack(interaction, client, data) {
    const betAmount = interaction.options.getNumber('bet');

    if (betAmount > data.Wallet) {
        return interaction.reply({
            content: `You don't have enough money in your wallet. You only have **$${data.Wallet.toLocaleString()}**.`,
            ephemeral: true
        });
    }
    
    cooldowns.set(interaction.user.id, Date.now() + 30000);

    data.Wallet -= betAmount;
    data.Gambled += 1;
    data.CommandsRan += 1;
    await data.save();

    const deck = createDeck();
    shuffleDeck(deck);
    
    const playerHand = [drawCard(deck), drawCard(deck)];
    const dealerHand = [drawCard(deck), drawCard(deck)];

    const playerTotal = calculateHandValue(playerHand);
    const dealerTotal = calculateHandValue(dealerHand);
    
    if (playerTotal === 21) {
        const winnings = Math.floor(betAmount * 2.5);
        data.Wallet += winnings;
        await data.save();
        
        const embed = createBlackjackEmbed(interaction, playerHand, dealerHand, winnings - betAmount, data.Wallet, 'blackjack');
        return interaction.reply({ embeds: [embed] });
    }

    const embed = createBlackjackEmbed(interaction, playerHand, [dealerHand[0], {rank: '?', suit: '?'}], 0, data.Wallet, 'in_progress');
    
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

    const gameState = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
        betAmount,
        playerHand,
        dealerHand,
        deck,
        stage: 'player_turn'
    };

    if (!client.blackjackGames) client.blackjackGames = new Map();
    client.blackjackGames.set(interaction.user.id, gameState);
    
    return interaction.reply({ embeds: [embed], components: [buttons] });
}

async function handleSlots(interaction, client, data) {
    const betAmount = interaction.options.getNumber('bet');

    if (betAmount > data.Wallet) {
        return interaction.reply({
            content: `You don't have enough money in your wallet. You only have **$${data.Wallet.toLocaleString()}**.`,
            ephemeral: true
        });
    }

    cooldowns.set(interaction.user.id, Date.now() + 10000);

    data.Wallet -= betAmount;
    data.Gambled += 1;
    data.CommandsRan += 1;

    const symbols = [
        { emoji: '🍒', value: 2 },
        { emoji: '🍊', value: 2 },
        { emoji: '🍋', value: 2 },
        { emoji: '🍇', value: 3 },
        { emoji: '🍉', value: 4 },
        { emoji: '🍓', value: 5 },
        { emoji: '⭐', value: 10 },
        { emoji: '💰', value: 15 },
        { emoji: '7️⃣', value: 25 }
    ];

    const reels = [];
    for (let i = 0; i < 3; i++) {
        reels.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }

    let winnings = 0;
    let multiplier = 0;

    if (reels[0].emoji === reels[1].emoji && reels[1].emoji === reels[2].emoji) {
        multiplier = reels[0].value;
        winnings = betAmount * multiplier;
    } else if (reels[0].emoji === reels[1].emoji || reels[1].emoji === reels[2].emoji || reels[0].emoji === reels[2].emoji) {
        if (reels[0].emoji === reels[1].emoji) {
            multiplier = reels[0].value * 0.5;
        } else if (reels[1].emoji === reels[2].emoji) {
            multiplier = reels[1].value * 0.5;
        } else {
            multiplier = reels[0].value * 0.5;
        }
        winnings = betAmount * multiplier;
    }

    data.Wallet += winnings;
    await data.save();
    
    const isWin = winnings > 0;
    const netProfit = winnings - betAmount;

    const slotResult = `┏━━━━━┓\n┃ ${reels[0].emoji} ${reels[1].emoji} ${reels[2].emoji} ┃\n┗━━━━━┛`;
    
    const embed = new EmbedBuilder()
        .setTitle('🎰 Slot Machine')
        .setColor(isWin ? '#00FF00' : '#FF0000')
        .setDescription(`**${slotResult}**\n\n${isWin ? 'You won!' : 'You lost!'}\n\nYou bet $${betAmount.toLocaleString()} and ${isWin ? `won $${winnings.toLocaleString()}` : 'won nothing'}.`)
        .addFields(
            { name: '💰 Bet Amount', value: `$${betAmount.toLocaleString()}`, inline: true },
            { name: '💵 Winnings', value: `$${winnings.toLocaleString()}`, inline: true },
            { name: '💸 Profit/Loss', value: `${netProfit >= 0 ? '+' : ''}$${netProfit.toLocaleString()}`, inline: true },
            { name: '👛 New Balance', value: `$${data.Wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: `You can gamble again in 10 seconds` })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

async function handleRoulette(interaction, client, data) {
    const betAmount = interaction.options.getNumber('bet');
    const betType = interaction.options.getString('bet_type');
    
    if (betAmount > data.Wallet) {
        return interaction.reply({
            content: `You don't have enough money in your wallet. You only have **$${data.Wallet.toLocaleString()}**.`,
            ephemeral: true
        });
    }
    
    cooldowns.set(interaction.user.id, Date.now() + 20000);
    
    data.Wallet -= betAmount;
    data.Gambled += 1;
    data.CommandsRan += 1;
    
    const rouletteWheel = [
        { number: 0, color: 'green' },
        { number: 1, color: 'red' }, { number: 2, color: 'black' }, { number: 3, color: 'red' },
        { number: 4, color: 'black' }, { number: 5, color: 'red' }, { number: 6, color: 'black' },
        { number: 7, color: 'red' }, { number: 8, color: 'black' }, { number: 9, color: 'red' },
        { number: 10, color: 'black' }, { number: 11, color: 'black' }, { number: 12, color: 'red' },
        { number: 13, color: 'black' }, { number: 14, color: 'red' }, { number: 15, color: 'black' },
        { number: 16, color: 'red' }, { number: 17, color: 'black' }, { number: 18, color: 'red' },
        { number: 19, color: 'red' }, { number: 20, color: 'black' }, { number: 21, color: 'red' },
        { number: 22, color: 'black' }, { number: 23, color: 'red' }, { number: 24, color: 'black' },
        { number: 25, color: 'red' }, { number: 26, color: 'black' }, { number: 27, color: 'red' },
        { number: 28, color: 'black' }, { number: 29, color: 'black' }, { number: 30, color: 'red' },
        { number: 31, color: 'black' }, { number: 32, color: 'red' }, { number: 33, color: 'black' },
        { number: 34, color: 'red' }, { number: 35, color: 'black' }, { number: 36, color: 'red' }
    ];
    
    const result = rouletteWheel[Math.floor(Math.random() * rouletteWheel.length)];
    
    let won = false;
    let payout = 0;
    
    switch (betType) {
        case 'red':
            if (result.color === 'red') {
                won = true;
                payout = betAmount * 2; 
            }
            break;
        case 'black':
            if (result.color === 'black') {
                won = true;
                payout = betAmount * 2; 
            }
            break;
        case 'even':
            if (result.number > 0 && result.number % 2 === 0) {
                won = true;
                payout = betAmount * 2; 
            }
            break;
        case 'odd':
            if (result.number > 0 && result.number % 2 === 1) {
                won = true;
                payout = betAmount * 2; 
            }
            break;
        case 'low':
            if (result.number >= 1 && result.number <= 18) {
                won = true;
                payout = betAmount * 2; 
            }
            break;
        case 'high':
            if (result.number >= 19 && result.number <= 36) {
                won = true;
                payout = betAmount * 2; 
            }
            break;
    }
    
    if (won) {
        data.Wallet += payout;
    }
    
    await data.save();
    
    let betTypeName = betType.charAt(0).toUpperCase() + betType.slice(1);
    if (betType === 'low') betTypeName = '1-18';
    if (betType === 'high') betTypeName = '19-36';
    
    const netProfit = won ? payout - betAmount : -betAmount;
    
    const resultColor = result.color === 'red' ? '🔴' : (result.color === 'black' ? '⚫' : '🟢');
    
    const embed = new EmbedBuilder()
        .setTitle('🎡 Roulette')
        .setColor(won ? '#00FF00' : '#FF0000')
        .setDescription(`The ball landed on **${resultColor} ${result.number}**\n\nYou bet on **${betTypeName}**\n\n${won ? 'You won!' : 'You lost!'}\n\nYou bet $${betAmount.toLocaleString()} and ${won ? `won $${payout.toLocaleString()}` : 'won nothing'}.`)
        .addFields(
            { name: '💰 Bet Amount', value: `$${betAmount.toLocaleString()}`, inline: true },
            { name: '💵 Winnings', value: won ? `$${payout.toLocaleString()}` : '$0', inline: true },
            { name: '💸 Profit/Loss', value: `${netProfit >= 0 ? '+' : ''}$${netProfit.toLocaleString()}`, inline: true },
            { name: '👛 New Balance', value: `$${data.Wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: `You can gamble again in 20 seconds` })
        .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
}

function createDeck() {
    const suits = ['♥', '♦', '♣', '♠'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck = [];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
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
