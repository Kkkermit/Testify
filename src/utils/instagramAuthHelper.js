const instagramApi = require('../api/instagramApi');

// Redirect all methods to the Instagram API module
module.exports = {
    getRandomUserAgent: instagramApi.getRandomUserAgent.bind(instagramApi),
    createInstagramHeaders: instagramApi.createInstagramHeaders.bind(instagramApi),
    instagramFetchWithRetry: instagramApi.fetchWithRetry.bind(instagramApi),
    delay: instagramApi.delay.bind(instagramApi),
    sessionManager: instagramApi.sessionManager
};
