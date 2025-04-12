const dictionaryCommand = require('../commands/Community/dictionary');
const { setupTest, teardownTest, MessageFlags } = require('./testUtils');
const filter = require('../jsons/filter.json');

jest.mock('../jsons/filter.json', () => ({
    words: ['badword']
}));

describe('dictionary command', () => {
    let interaction;
    let client;
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
        global.fetch = jest.fn();
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        teardownTest();
    });

    it('should fetch word definition and reply with an embed', async () => {
        const mockWord = 'test';
        interaction.options.getString.mockReturnValue(mockWord);
        
        const mockResponse = {
            ok: true,
            statusText: 'OK',
            json: jest.fn().mockResolvedValue([{
                word: 'test',
                meanings: [
                    {
                        partOfSpeech: 'noun',
                        definitions: [
                            {
                                definition: 'A procedure intended to establish quality or performance',
                                example: 'The test was a success'
                            }
                        ]
                    },
                    {
                        partOfSpeech: 'verb',
                        definitions: [
                            {
                                definition: 'Take measures to check the quality or performance of',
                                example: 'The cars are tested before leaving the factory'
                            }
                        ]
                    }
                ]
            }])
        };
        
        global.fetch.mockResolvedValue(mockResponse);

        await dictionaryCommand.execute(interaction, client);

        expect(global.fetch).toHaveBeenCalledWith(`https://api.dictionaryapi.dev/api/v2/entries/en/${mockWord}`);
        expect(interaction.reply).toHaveBeenCalledWith({
            embeds: [
                {
                    data: {
                        author: { name: 'Dictionary Lookup DevName' },
                        title: 'TestBot Dictionary Lookup ➡️',
                        description: '> Definition and examples of the word **test**',
                        color: 65280,
                        fields: [
                            { 
                                name: 'NOUN', 
                                value: '``` Definition: A procedure intended to establish quality or performance \n Example: The test was a success ```' 
                            },
                            { 
                                name: 'VERB', 
                                value: '``` Definition: Take measures to check the quality or performance of \n Example: The cars are tested before leaving the factory ```' 
                            }
                        ],
                        footer: { text: 'Dictionary lookup for test' },
                        timestamp: '2024-09-28T00:12:30.643Z',
                    },
                },
            ],
        });
    });

    it('should handle filtered words', async () => {
        const mockWord = 'badword';
        interaction.options.getString.mockReturnValue(mockWord);

        await dictionaryCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({ 
            content: client.config.filterMessage, 
            flags: MessageFlags.Ephemeral 
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle non-existent words', async () => {
        const mockWord = 'nonexistentword';
        interaction.options.getString.mockReturnValue(mockWord);
        
        const mockResponse = {
            statusText: 'Not Found'
        };
        
        global.fetch.mockResolvedValue(mockResponse);

        await dictionaryCommand.execute(interaction, client);

        expect(global.fetch).toHaveBeenCalledWith(`https://api.dictionaryapi.dev/api/v2/entries/en/${mockWord}`);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'That word **does not** exist',
            flags: MessageFlags.Ephemeral
        });
    });
});
