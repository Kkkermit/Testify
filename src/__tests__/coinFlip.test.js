const coinFlipCommand = require('../commands/Community/coinFlip');

describe('coin-flip command', () => {
    let interaction;
    let client;

    beforeEach(() => {
        interaction = {
            reply: jest.fn(),
            editReply: jest.fn(),
            user: {
                tag: 'TestUser#1234',
                displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
            },
        };

        client = {
            user: {
                username: 'TestBot',
                avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
            },
            config: {
                devBy: 'DevName',
                arrowEmoji: '➡️',
                embedCommunity: '#00FF00',
            },
        };

        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-09-28T00:12:30.643Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should reply with a coin flip embed and then edit the reply with the result', async () => {
        await coinFlipCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        author: { 
                            icon_url: undefined,
                            name: 'Coin Flip Command DevName',
                            url: undefined
                        },
                        title: 'TestBot Coin Flip Tool ➡️',
                        description: 'Flipping a coin...',
                        color: 65280,
                        image: { 
                            url: 'https://media.discordapp.net/attachments/1083650198850523156/1084439687495700551/img_7541.gif?width=1600&height=1200' 
                        },
                    }
                },
            ],
            fetchReply: true,
        });

        jest.advanceTimersByTime(1000);

        expect(interaction.editReply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        author: { 
                            icon_url: undefined,
                            name: 'Coin Flip Command DevName',
                            url: undefined
                        },
                        title: 'TestBot Coin Flip Tool ➡️',
                        description: expect.stringMatching(/Its a \*\*(Heads|Tails)\*\*/),
                        color: 65280,
                        thumbnail: { 
                            url: 'https://example.com/avatar.png' 
                        },
                        footer: { 
                            text: 'Requested by TestUser#1234', 
                            icon_url: 'https://example.com/avatar.png' 
                        },
                        timestamp: '2024-09-28T00:12:31.643Z',
                    },
                },
            ],
        });
    });
});