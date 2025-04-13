const { setupTest, teardownTest, MessageFlags } = require('./utils/testUtils');

const mockSearch = jest.fn();
const mockPage = jest.fn();
const mockSummaryFn = jest.fn();

jest.mock('wikijs', () => {
    const mock = {
        default: jest.fn().mockReturnValue({
            search: mockSearch,
            page: mockPage
        })
    };
    return mock;
});

jest.mock('../jsons/filter.json', () => ({
    words: ['badword']
}));

const wikiCommand = require('../commands/Community/wiki');

describe('wiki command', () => {
    let interaction;
    let client;
    let mockPageObject;

    beforeEach(() => {
        jest.clearAllMocks();
        
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;

        interaction.deferReply = jest.fn().mockResolvedValue();
        interaction.editReply = jest.fn().mockResolvedValue();

        mockPageObject = {
            summary: mockSummaryFn,
            raw: {
                title: 'Test Title',
                fullurl: 'https://en.wikipedia.org/wiki/Test_Title'
            }
        };

        mockSearch.mockResolvedValue({ results: ['Test Title'] });
        mockPage.mockResolvedValue(mockPageObject);
    });

    afterEach(() => {
        teardownTest();
    });

    it('should fetch wiki information and display it in an embed', async () => {
        const query = 'JavaScript';
        interaction.options.getString.mockReturnValue(query);

        const mockSummary = 'JavaScript is a programming language used for web development.';
        mockSummaryFn.mockResolvedValue(mockSummary);
        
        await wikiCommand.execute(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(mockSearch).toHaveBeenCalledWith(query);
        expect(mockPage).toHaveBeenCalledWith('Test Title');
        expect(mockSummaryFn).toHaveBeenCalled();

        expect(interaction.editReply).toHaveBeenCalled();
        const replyCall = interaction.editReply.mock.calls[0][0];
        expect(replyCall.embeds).toBeDefined();
        expect(replyCall.embeds.length).toBe(1);

        const embed = replyCall.embeds[0];
        expect(embed.data).toMatchObject({
            author: { name: 'Wiki Command DevName' },
            title: 'TestBot Wiki Tool ➡️',
            description: 'Wiki search: Test Title',
            color: 65280,
            url: 'https://en.wikipedia.org/wiki/Test_Title'
        });

        expect(embed.data.fields[0]).toEqual({
            name: 'Result',
            value: '```JavaScript is a programming language used for web development.```'
        });

        expect(embed.data.timestamp).toBeDefined();
        expect(embed.data.footer.text).toContain('Requested by');
    });

    it('should handle filtered words', async () => {
        interaction.options.getString.mockReturnValue('badword');

        await wikiCommand.execute(interaction, client);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: client.config.filterMessage,
            flags: MessageFlags.Ephemeral
        });

        expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should handle no search results', async () => {
        const query = 'nonexistentquery123456789';
        interaction.options.getString.mockReturnValue(query);
        mockSearch.mockResolvedValue({ results: [] });

        await wikiCommand.execute(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(mockSearch).toHaveBeenCalledWith(query);
        expect(mockPage).not.toHaveBeenCalled();

        expect(interaction.editReply).toHaveBeenCalledWith({
            content: "Wikipedia doesn't seem to know what you are talking about...",
            flags: MessageFlags.Ephemeral
        });
    });

    it('should truncate very long summaries', async () => {
        const query = 'LongArticle';
        interaction.options.getString.mockReturnValue(query);

        const longSummary = 'A'.repeat(10000);
        mockSummaryFn.mockResolvedValue(longSummary);
        
        await wikiCommand.execute(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(mockSearch).toHaveBeenCalledWith(query);
        expect(mockPage).toHaveBeenCalled();

        expect(interaction.editReply).toHaveBeenCalledWith({
            content: longSummary.slice(0, 1020),
            flags: MessageFlags.Ephemeral
        });
    });

    it('should handle wiki API errors', async () => {
        const query = 'ErrorQuery';
        interaction.options.getString.mockReturnValue(query);

        const mockError = new Error('Wiki API error');
        mockSearch.mockRejectedValue(mockError);

        try {
            await wikiCommand.execute(interaction, client);
            fail('The command should have thrown an error');
        } catch (error) {
            expect(error.message).toBe('Wiki API error');
        }
        
        expect(mockSearch).toHaveBeenCalledWith(query);
    });
});
