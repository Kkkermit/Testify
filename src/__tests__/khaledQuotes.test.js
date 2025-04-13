const khaledQuotesCommand = require('../commands/Community/khalidQuotes');
const { setupTest, teardownTest } = require('./testUtils');

// Mock the khalidQuotes.json dependency
jest.mock('../jsons/khalidQuotes.json', () => [
    'They don\'t want us to win.',
    'Another one.',
    'We the best music!',
    'Major key alert!'
]);

describe('khaled-quotes command', () => {
    let interaction;
    let client;
    
    let randomSpy;

    beforeEach(() => {
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
        
        randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
        randomSpy.mockRestore();
    });

    it('should reply with an embed containing a random DJ Khaled quote', async () => {
        await khaledQuotesCommand.execute(interaction, client);
        
        const expectedQuote = 'We the best music!';
        
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        author: { name: '🗣️ • Khaled Quotes' },
                        footer: { text: '🗣️ • God did' },
                        title: 'Right From DJ Khaled himself!',
                        thumbnail: { url: 'https://media.tenor.com/6Exkhhjc4HgAAAAd/dj-khaled.gif' },
                        description: `> ${expectedQuote}`,
                        timestamp: '2024-09-28T00:12:30.643Z',
                    }
                }
            ]
        });
    });

    it('should select quotes based on random number generation', async () => {
        
        randomSpy.mockReturnValue(0);
        await khaledQuotesCommand.execute(interaction, client);
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [expect.objectContaining({
                data: expect.objectContaining({
                    description: '> They don\'t want us to win.'
                })
            })]
        });

        interaction.reply.mockClear();
        
        randomSpy.mockReturnValue(0.999);
        await khaledQuotesCommand.execute(interaction, client);
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [expect.objectContaining({
                data: expect.objectContaining({
                    description: '> Major key alert!'
                })
            })]
        });
    });
});
