const { MessageFlags } = require('discord.js');

/**
 * Create mock interaction and client objects for testing
 * @param {Object} options - Optional overrides for the mock objects
 * @returns {Object} Object containing interaction and client mocks
 */
function setupTest(options = {}) {
    const interaction = {
        reply: jest.fn(),
        editReply: jest.fn(),
        user: {
            tag: 'TestUser#1234',
            displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
        },
        options: {
            getString: jest.fn(),
        },
        ...options.interaction
    };

    const client = {
        user: {
            username: 'TestBot',
            avatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
        },
        config: {
            devBy: 'DevName',
            arrowEmoji: '➡️',
            embedCommunity: '#00FF00',
            filterMessage: 'This word is not allowed.',
        },
        ...options.client
    };

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-09-28T00:12:30.643Z'));

    return { interaction, client };
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
    MessageFlags
};
