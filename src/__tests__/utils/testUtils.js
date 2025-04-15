const { MessageFlags, PermissionsBitField, ButtonStyle, ChannelType, TextInputStyle } = require('discord.js');

/**
 * Create mock interaction and client objects for testing
 * @param {Object} options - Optional overrides for the mock objects
 * @returns {Object} Object containing interaction and client mocks
 */
function setupTest(options = {}) {
    const mockCollector = {
        on: jest.fn((event, callback) => {
            mockCollector.callbacks = mockCollector.callbacks || {};
            mockCollector.callbacks[event] = callback;
            return mockCollector;
        }),
        simulateCollect: function(data) {
            if (this.callbacks && this.callbacks.collect) {
                return this.callbacks.collect(data);
            }
        }
    };

    const mockMessage = {
        createMessageComponentCollector: jest.fn().mockReturnValue(mockCollector)
    };

    const mockWebhook = {
        send: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        edit: jest.fn().mockResolvedValue({}),
        fetchMessage: jest.fn().mockResolvedValue({}),
        ...options.webhook,
    };

    const mockWebhookClient = {
        send: jest.fn().mockResolvedValue({}),
        destroy: jest.fn(),
        ...options.webhookClient,
    };

    const mockChannel = {
        createWebhook: jest.fn().mockResolvedValue(mockWebhook),
        id: 'mock-channel-123',
        ...options.channel,
    };

    const mockMember = {
        permissions: {
            has: jest.fn().mockReturnValue(true),
        },
        ...options.member,
    };

    const mockUser = {
        displayName: 'MockUser',
        displayAvatarURL: jest.fn().mockReturnValue('https://example.com/mock-avatar.png'),
        tag: 'MockUser#1234',
        id: 'mock-user-123',
        ...options.user,
    };

    const mockShowModal = jest.fn(modal => {
        interaction.lastShownModal = {
            customId: modal.customId || modal.data?.custom_id,
            title: modal.title,
            components: modal.components
        };
        return Promise.resolve();
    });

    const interaction = {
        reply: jest.fn().mockResolvedValue(mockMessage),
        editReply: jest.fn(),
        deferReply: jest.fn().mockResolvedValue({}),
        followUp: jest.fn().mockResolvedValue({}),
        showModal: mockShowModal,
        awaitModalSubmit: jest.fn(),
        lastShownModal: null,
        user: mockUser,
        options: {
            getString: jest.fn(),
            getUser: jest.fn().mockReturnValue(mockUser),
            getInteger: jest.fn(),
            getSubcommand: jest.fn(),
            getChannel: jest.fn(),
            getBoolean: jest.fn(),
        },
        member: mockMember,
        channel: mockChannel,
        client: {
            ws: {
                ping: 42
            }
        },
        ...options.interaction
    };

    const client = {
        user: {
            username: 'TestBot',
            avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
            displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
        },
        config: {
            devBy: 'DevName',
            arrowEmoji: '➡️',
            embedCommunity: '#00FF00',
            embedEconomy: '#FFD700',
            filterMessage: 'This word is not allowed.',
            noPerms: 'You do not have permission to use this command.',
        },
        ...options.client
    };

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-09-28T00:12:30.643Z'));

    return { 
        interaction, 
        client, 
        mockWebhook,
        mockWebhookClient,
        mockChannel,
        mockUser,
        mockMember,
        mockMessage,
        mockCollector
    };
}

/**
 * Clean up timers after test
 */
function teardownTest() {
    jest.useRealTimers();
}


module.exports = {
    setupTest,
    teardownTest,
    MessageFlags,
    PermissionsBitField,
    ButtonStyle,
    ChannelType,
    TextInputStyle
};
