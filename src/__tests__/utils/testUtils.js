const { MessageFlags, PermissionsBitField, ButtonStyle, ChannelType } = require('discord.js');

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

    const interaction = {
        reply: jest.fn().mockResolvedValue(mockMessage),
        editReply: jest.fn(),
        user: mockUser,
        options: {
            getString: jest.fn(),
            getUser: jest.fn().mockReturnValue(mockUser),
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
    ChannelType
};
