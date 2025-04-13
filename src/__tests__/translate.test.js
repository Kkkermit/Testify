const translateCommand = require('../commands/Community/translate');
const { setupTest, teardownTest } = require('./utils/testUtils');
const translate = require('@iamtraction/google-translate');

jest.mock('@iamtraction/google-translate');

describe('translate command', () => {
    let interaction;
    let client;

    beforeEach(() => {
        const setup = setupTest();
        interaction = setup.interaction;
        client = setup.client;
    });

    afterEach(() => {
        teardownTest();
        jest.clearAllMocks();
    });

    it('should translate text and reply with an embed', async () => {
        const mockText = 'Hello world';
        const mockFromLang = 'en';
        const mockToLang = 'es';
        
        interaction.options.getString.mockImplementation((option) => {
            if (option === 'text') return mockText;
            if (option === 'from') return mockFromLang;
            if (option === 'to') return mockToLang;
            return null;
        });

        const mockTranslation = {
            text: 'Hola mundo',
            from: {
                language: { iso: 'en' }
            }
        };
        translate.mockResolvedValue(mockTranslation);

        await translateCommand.execute(interaction, client);

        expect(translate).toHaveBeenCalledWith(mockText, { 
            from: mockFromLang, 
            to: mockToLang 
        });

        expect(interaction.reply).toHaveBeenCalled();
        const replyCall = interaction.reply.mock.calls[0][0];
        expect(replyCall.embeds).toBeDefined();
        expect(replyCall.embeds.length).toBe(1);

        const embed = replyCall.embeds[0];
        expect(embed.data).toMatchObject({
            author: { name: 'Google Translate DevName' },
            title: 'TestBot has translated a message ➡️',
            description: `> **From:** ${mockFromLang} **to:** ${mockToLang}`,
            color: 65280,
            footer: { text: 'Google Translate' }
        });

        const fields = embed.data.fields;
        expect(fields).toHaveLength(2);
        expect(fields[0]).toEqual({ name: 'Inputted Text', value: `> ${mockText}` });
        expect(fields[1]).toEqual({ name: 'Translated Text', value: `> ${mockTranslation.text}` });

        expect(embed.data.timestamp).toBeDefined();
    });

    it('should handle automatic language detection', async () => {
        const mockText = 'Hello world';
        const mockFromLang = 'auto';
        const mockToLang = 'fr';
        
        interaction.options.getString.mockImplementation((option) => {
            if (option === 'text') return mockText;
            if (option === 'from') return mockFromLang;
            if (option === 'to') return mockToLang;
            return null;
        });

        const mockTranslation = {
            text: 'Bonjour le monde',
            from: {
                language: { iso: 'en' }
            }
        };
        translate.mockResolvedValue(mockTranslation);

        await translateCommand.execute(interaction, client);

        expect(translate).toHaveBeenCalledWith(mockText, { 
            from: mockFromLang, 
            to: mockToLang 
        });

        const replyCall = interaction.reply.mock.calls[0][0];
        const embed = replyCall.embeds[0];
        expect(embed.data.description).toBe(`> **From:** ${mockFromLang} **to:** ${mockToLang}`);
        expect(embed.data.fields[1].value).toBe(`> ${mockTranslation.text}`);
    });

    it('should handle translation errors', async () => {
        interaction.options.getString.mockImplementation((option) => {
            if (option === 'text') return 'Hello';
            if (option === 'from') return 'en';
            if (option === 'to') return 'invalid-language';
            return null;
        });

        const mockError = new Error('Invalid language');
        translate.mockRejectedValue(mockError);

        try {
            await translateCommand.execute(interaction, client);
        } catch (error) {
            expect(error).toEqual(mockError);
        }

        expect(translate).toHaveBeenCalledWith('Hello', { 
            from: 'en', 
            to: 'invalid-language' 
        });
    });

    it('should translate between multiple language pairs', async () => {
        const testCases = [
            { text: 'Hello', from: 'en', to: 'es', translated: 'Hola' },
            { text: 'Bonjour', from: 'fr', to: 'en', translated: 'Hello' },
            { text: '你好', from: 'zh-cn', to: 'en', translated: 'Hello' }
        ];
        
        for (const testCase of testCases) {
            jest.clearAllMocks();
            
            interaction.options.getString.mockImplementation((option) => {
                if (option === 'text') return testCase.text;
                if (option === 'from') return testCase.from;
                if (option === 'to') return testCase.to;
                return null;
            });
            
            translate.mockResolvedValue({
                text: testCase.translated,
                from: { language: { iso: testCase.from } }
            });
            
            await translateCommand.execute(interaction, client);
            
            expect(translate).toHaveBeenCalledWith(testCase.text, {
                from: testCase.from,
                to: testCase.to
            });
            
            const replyCall = interaction.reply.mock.calls[0][0];
            const embed = replyCall.embeds[0];
            expect(embed.data.fields[0].value).toBe(`> ${testCase.text}`);
            expect(embed.data.fields[1].value).toBe(`> ${testCase.translated}`);
        }
    });
});
