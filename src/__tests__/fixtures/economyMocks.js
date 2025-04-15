/**
 * Mock data and utilities for economy system tests
 */

/**
 * Creates an economy user data mock with customizable properties
 * @param {Object} options - Options for the economy data
 * @returns {Object} A mock economy user data object
 */
function createEconomyUserMock(options = {}) {
    return {
        Guild: options.guildId || 'test-guild-id',
        User: options.userId || 'test-user-id',
        CommandsRan: options.commandsRan || 0,
        Begged: options.begged || 0,
        Worked: options.worked || 0,
        HoursWorked: options.hoursWorked || 0,
        Bank: options.bank || 0,
        Wallet: options.wallet || 0,
        Gambled: options.gambled || 0,
        Moderated: options.moderated || 0,
        save: jest.fn().mockResolvedValue(true),
        ...options.extraFields
    };
}

/**
 * Create a mock timeout array to use in economy command tests
 * @param {Array} initialUsers - Initial user IDs to include in timeout
 * @returns {Object} Object containing the timeout array and utility methods
 */
function createTimeoutMock(initialUsers = []) {
    const mockTimeoutArray = [...initialUsers];
    
    return {
        timeoutArray: mockTimeoutArray,
        addToTimeout: (userId) => mockTimeoutArray.push(userId),
        removeFromTimeout: () => mockTimeoutArray.shift(),
        clearTimeout: () => mockTimeoutArray.length = 0,
        isUserInTimeout: (userId) => mockTimeoutArray.includes(userId)
    };
}

/**
 * Create mock for command module using our controlled timeout
 * @param {Object} originalModule - The original command module 
 * @param {Array} mockTimeoutArray - Array to use as timeout
 * @returns {Object} Modified module with mockable timeout
 */
function createCommandWithMockTimeout(originalModule, mockTimeoutArray) {
    return {
        ...originalModule,
        timeout: mockTimeoutArray,
        data: originalModule.data
    };
}

module.exports = {
    createEconomyUserMock,
    createTimeoutMock,
    createCommandWithMockTimeout
};
