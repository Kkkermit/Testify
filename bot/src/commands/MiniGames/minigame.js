const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Wordle, Connect4, TwoZeroFourEight, Minesweeper, RockPaperScissors, Snake, TicTacToe, MatchPairs, Hangman, Flood, FindEmoji, Slots, Trivia } = require('discord-gamecord');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('minigame')
    .setDescription(`Play a some minigames!`)
    .setDMPermission(false)
    .addSubcommand(subcommand => subcommand.setName('wordle').setDescription(`Play a game of Wordle!`))
    .addSubcommand(subcommand => subcommand.setName('connect4').setDescription(`Play a game of Connect4!`).addUserOption(option => option.setName('opponent').setDescription('Specified user will be your opponent.').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('2048').setDescription(`Play a game of 2048!`))
    .addSubcommand(subcommand => subcommand.setName('minesweeper').setDescription('Play a game of explosive minesweeper!'))
    .addSubcommand(subcommand => subcommand.setName('rps').setDescription('Play a game of Rock Paper Scissors!').addUserOption(option => option.setName('opponent').setDescription('Specified user will be your opponent.').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('snake').setDescription('Play a game of Snake!'))
    .addSubcommand(subcommand => subcommand.setName('tictactoe').setDescription('Play a game of Tic Tac Toe!').addUserOption(option => option.setName('opponent').setDescription('Specified user will be your opponent.').setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName('match-pairs').setDescription('Play a game of Match Pairs!'))
    .addSubcommand(subcommand => subcommand.setName('hangman').setDescription('Play a game of Hangman!'))
    .addSubcommand(subcommand => subcommand.setName('flood').setDescription('Play a game of Flood!'))
    .addSubcommand(subcommand => subcommand.setName('find-emoji').setDescription('Play a game of Find Emoji!'))
    .addSubcommand(subcommand => subcommand.setName('would-you-rather').setDescription('Play a game of Would You Rather!'))
    .addSubcommand(subcommand => subcommand.setName('slots').setDescription('Play a game of Slots!'))
    .addSubcommand(subcommand => subcommand.setName('trivia').setDescription('Play a game of Trivia!').addStringOption(option => option.setName('difficulty').setDescription('Select the difficulty of the trivia game.')
        .addChoices(
            { name: 'easy', value: 'easy' },
            { name: 'medium', value: 'medium' },
            { name: 'hard', value: 'hard' },
        ).setRequired(true))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();
        const gameFail = '\`\`\`There was an error starting the game!\`\`\`';

        switch(sub) {
            case "wordle":

            const gameWordle = new Wordle({
                message: interaction,
                isSlashGame: false,
                embed: {
                    title: `> Wordle`,
                    color: client.config.embedMiniGames
                },
                customWord: null,
                timeoutTime: 60000,
                winMessage: '> 🎉 | You won! The word was **{word}**',
                loseMessage: '> You lost! The word was **{word}**',
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only {player} can use these buttons'
            });
    
            try {
                await gameWordle.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "connect4":

            const enemy = interaction.options.getUser('opponent');
            if (interaction.user.id === enemy.id) return await interaction.reply({ content: `You **cannot** play against yourself`, ephemeral: true });
            if (enemy.bot) return await interaction.reply({ content: `You **cannot** play against bot`, ephemeral: true });
    
            const gameConnect4 = new Connect4({
            message: interaction,
            isSlashGame: true,
            opponent: interaction.options.getUser('opponent'),
            embed: {
                title: "> Connect Four Game",
                rejectTitle: "**Cancelled Request**",
                statusTitle: "> Status",
                overTitle: "> Game Over",
                color: client.config.embedMiniGames,
                rejectColor: "Red",
            },
            emojis: {
                board: "🔵",
                player1: "🔴",
                player2: "🟡",
            },
            mentionUser: true,
            timeoutTime: 120000,
            buttonStyle: "PRIMARY",
            turnMessage: "> {emoji} | **{player}**, it is your turn!.",
            winMessage: "> 🎉 | **{player}** has won the Connect Four Game!",
            tieMessage: "> The game turned out to be a tie!",
            timeoutMessage: "> The game went unfinished! no one won the game!",
            playerOnlyMessage: "Only **{player}** and **{opponent}** can use these buttons.",
            rejectMessage: "**{opponent}** denied your request for a round of Connect Four!",
            });
    
            try {
                await gameConnect4.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "2048":

            const game2048 = new TwoZeroFourEight({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: "2048",
                    color: client.config.embedMiniGames,
                },
                emojis: {
                    up: "⬆️",
                    down: "⬇️",
                    left: "⬅️",
                    right: "➡️",
                },
                timeoutTime: 60000,
                buttonStyle: "PRIMARY",
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: "Only **{player}** can use these buttons.",
            });
        
            try {
                await game2048.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "minesweeper":
                
            const gameMinesweeper = new Minesweeper({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: "> Minesweeper",
                    color: client.config.embedMiniGames,
                    description: "Click on the **buttons** to reveal the blocks *except* mines.",
                },
                emojis: { flag: "🚩", mine: "💣" },
                mines: 5,
                timeoutTime: 60000,
                winMessage: "> 🎉 | You have **won** the game! All mines were successfully avoided by you. ",
                loseMessage: "> You failed the game. Next time, be cautious of the mines.",
                timeoutMessage: '> The game went **unfinished**.',
                playerOnlyMessage: "Only **{player}** can use these buttons.",
            });
                
            try {
                await gameMinesweeper.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "rps":

            const enemy1 = interaction.options.getUser('opponent');
            if (interaction.user.id === enemy1.id) return await interaction.reply({ content: `You **cannot** play against yourself`, ephemeral: true });
            if (enemy1.bot) return await interaction.reply({ content: `You **cannot** play against bot`, ephemeral: true });
        
            const gameRPS = new RockPaperScissors({
                message: interaction,
                isSlashGame: true,
                opponent: interaction.options.getUser('opponent'),
                embed: {
                    title: "Rock Paper Scissors",
                    rejectTitle: "Cancelled Request",
                    statusTitle: "> Status",
                    overTitle: "> Game Over",
                    color: client.config.embedMiniGames,
                    rejectColor: "Red",
                },
                buttons: {
                    rock: "Rock",
                    paper: "Paper",
                    scissors: "Scissors",
                },
                emojis: {
                    rock: "🌑",
                    paper: "📰",
                    scissors: "✂️",
                },
                mentionUser: true,
                timeoutTime: 120000,
                buttonStyle: "PRIMARY",
                pickMessage: "> You chose {emoji}.",
                winMessage: "> 🎉 | **{player}** has won the Rock-Paper-Scissors Game!",
                tieMessage: "> The game turned out to be a tie!",
                timeoutMessage: "> The game went unfinished.",
                playerOnlyMessage: "Only **{player}** and **{opponent}** can use these buttons!",
                rejectMessage: "**{opponent}** denied your request for a round of Tic Tac Toe!",
            });
        
            try {
                await gameRPS.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "snake":

            const gameSnake = new Snake({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: '> Snake Game',
                    overTitle: 'Game Over',
                    color: client.config.embedMiniGames
                },
                emojis: {
                    board: '⬛',
                    food: '🍎',
                    up: '⬆️', 
                    down: '⬇️',
                    left: '⬅️',
                    right: '➡️',
                },
                snake: { head: '🟢', body: '🟩', tail: '🟢', over: '💀' },
                foods: ['🍎', '🍇', '🍊', '🫐', '🥕', '🥝', '🌽'],
                stopButton: 'Stop',
                timeoutTime: 60000,
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only **{player}** can use these buttons.'
            });
            
            try {
                await gameSnake.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "tictactoe":

            const enemy2 = interaction.options.getUser('opponent');
            if (interaction.user.id === enemy2.id) return await interaction.reply({ content: `You **cannot** play against yourself`, ephemeral: true });
            if (enemy2.bot) return await interaction.reply({ content: `You **cannot** play against bot`, ephemeral: true });

            const gameTTT = new TicTacToe({
                message: interaction,
                isSlashGame: true,
                opponent: interaction.options.getUser('opponent'),
                embed: {
                    title: '> Tic Tac Toe',
                    rejectTitle: "Cancelled Request",
                    color: client.config.embedMiniGames,
                    statusTitle: '> Status',
                    overTitle: '> Game Over',
                    rejectColor: "Red",
                },
                emojis: {
                    xButton: '❌',
                    oButton: '🔵',
                    blankButton: '➖'
                },
                mentionUser: true,
                timeoutTime: 120000,
                xButtonStyle: 'DANGER',
                oButtonStyle: 'PRIMARY',
                turnMessage: '> {emoji} | **{player}**, it is your turn!.',
                winMessage: '> 🎉 | **{player}** has won the Tic Tac Toe Game!',
                tieMessage: '> The game turned out to be a tie!',
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only **{player}** and **{opponent}** can use these buttons.',
                rejectMessage: "**{opponent}** denied your request for a round of Tic Tac Toe!",
            });
            
            try {
                await gameTTT.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "match-pairs":

            const gameMatchPairs = new MatchPairs({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: '> Match Pairs',
                    color: client.config.embedMiniGames,
                    description: '**Click on the buttons to match emojis with their pairs.**'
                },
                timeoutTime: 60000,
                emojis: ['🍉', '🍇', '🍊', '🥭', '🍎', '🍏', '🥝', '🥥', '🍓', '🍒', '🍍', '🥕', '🥔'],
                winMessage: '> 🎉 | **You won the Game! You turned a total of `{tilesTurned}` tiles.**',
                loseMessage: '> **You lost the Game! You turned a total of `{tilesTurned}` tiles.**',
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only **{player}** can use these buttons.'
            });
            
            try {
                await gameMatchPairs.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "hangman":

            const gameHangman = new Hangman({
                message: interaction,
                embed: {
                    title: `> Hangman`,
                    color: client.config.embedMiniGames
                },
                hangman: { hat: "🎩", head: `👨‍🦰`, shirt: `👕`, pants: `🩳`, boots: `🥾🥾`},
                timeoutTime: 60000,
                timeWords: "all",
                winMessage: `> 🎉 | You won! The word was **{word}**`,
                loseMessage: `> You lost, the word was **{word}**`,
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: `Only **{player}** can use these buttons`,
            })

            try {
                await gameHangman.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "flood":

            const gameFlood = new Flood({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: '> Flood',
                    color: client.config.embedMiniGames,
                },
                difficulty: 8,
                timeoutTime: 60000,
                buttonStyle: 'PRIMARY',
                emojis: ['🟥', '🟦', '🟧', '🟪', '🟩'],
                winMessage: '> 🎉 | You won! You took **{turns}** turns.',
                loseMessage: '> You lost! You took **{turns}** turns.',
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only **{player}** can use these buttons.'
            });
            
            try {
                await gameFlood.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }

            break;
            case "find-emoji":

            const gameFindEmoji = new FindEmoji({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: '> Find Emoji',
                    color: client.config.embedMiniGames,
                    description: 'Remember the emojis from the board below.',
                    findDescription: 'Find the {emoji} emoji before the time runs out.'
                },
                timeoutTime: 60000,
                hideEmojiTime: 5000,
                buttonStyle: 'PRIMARY',
                emojis: ['🍉', '🍇', '🍊', '🍋', '🥭', '🍎', '🍏', '🥝'],
                winMessage: '> 🎉 | You won! You selected the correct emoji. {emoji}',
                loseMessage: '> You lost! You selected the wrong emoji. {emoji}',
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only **{player}** can use these buttons.'
            });
            
            try {
                await gameFindEmoji.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }
            
            break;
            case "slots":

            const gameSlots = new Slots({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: '> Slot Machine',
                    color: client.config.embedMiniGames
                },
                slots: ['🍇', '🍊', '🍋', '🍌']
            });
            
            try {
                await gameSlots.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply('\`\`\`There was an error starting the game!\`\`\`');
            }

            break;
            case 'would-you-rather':

            const questions = require('../../jsons/wouldYouRather.json');
            const randomize = questions[Math.floor(Math.random() * questions.length)]

            const embed1 = new EmbedBuilder()
            .setTitle(`> 🤔 Would You Rather ${client.config.arrowEmoji}`)
            .setDescription(`> ${randomize}`)
            .setThumbnail(client.user.avatarURL())
            .setAuthor({ name: `${client.user.username} Would You Rather ${client.config.devBy}`})
            .setFooter({ text: `Random Question initialized`})
            .setColor(client.config.embedMiniGames)
            .setTimestamp()
        
            const embed2 = new EmbedBuilder()
            .setTitle(`> 🤔 Would You Rather ${client.config.arrowEmoji}`)
            .setDescription('You chose **option 1**')
            .setAuthor({ name: `${client.user.username} Would You Rather ${client.config.devBy}`})
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Random Question chosen`})
            .setColor(client.config.embedMiniGames)
            .setTimestamp()
        
            const embed3 = new EmbedBuilder()
            .setTitle(`> 🤔 Would You Rather ${client.config.arrowEmoji}`)
            .setDescription('You chose **option 2**')
            .setAuthor({ name: `${client.user.username} Would You Rather ${client.config.devBy}`})
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: `Random Question chosen`})
            .setColor(client.config.embedMiniGames)
            .setTimestamp()

            const button1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setCustomId('option1')
                .setLabel('Option 1')
                .setStyle(ButtonStyle.Success), 
                
                new ButtonBuilder()
                .setCustomId('option2')
                .setLabel('Option 2')
                .setStyle(ButtonStyle.Danger),
            
            )

            const message = await interaction.reply({ embeds: [embed1], components: [button1] });
            const collector1 = message.createMessageComponentCollector();

            const menu = 'You **cannot** use this menu.';

            collector1.on('collect', async i => {
                try {
                    if (i.customId === 'option1' || i.customId === 'option2') {
                        if (i.user.id !== interaction.user.id) {
                            return await i.reply({ content: `${menu}`, ephemeral: true });
                        }

                        await i.deferUpdate(); // Acknowledge the interaction

                        if (i.customId === 'option1') {
                            await i.editReply({ embeds: [embed2], components: [] });
                        } else if (i.customId === 'option2') {
                            await i.editReply({ embeds: [embed3], components: [] });
                        }
                    }
                } catch (error) {
                    console.error('Error handling button interaction:', error);
                }
            });

            break;
            case "trivia":

            const difficulty = interaction.options.getString('difficulty');

            const gameTrivia = new Trivia({
                message: interaction,
                isSlashGame: true,
                embed: {
                    title: '> Trivia Game \nAnswer the question below.',
                    color: client.config.embedMiniGames,
                },
                difficulty: difficulty,
                timeoutTime: 60000,
                winMessage: '> 🎉 | You answered the question correctly!',
                loseMessage: '> You answered the question incorrectly!',
                timeoutMessage: '> The game went unfinished.',
                playerOnlyMessage: 'Only **{player}** can use these buttons.',
            });

            try {
                await gameTrivia.startGame();
            } catch (err) {
                console.log(err);
                await interaction.reply(gameFail);
            }
        }
    }
}
