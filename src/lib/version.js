const axios = require('axios');
const config = require('../config')
const { color, getTimestamp } = require('../utils/loggingEffects.js');

async function getLatestVersion() {
    try {
        const response = await axios.get('https://api.github.com/repos/Kkkermit/Testify/releases/latest');
        const latestVersion = response.data.tag_name;
        return latestVersion;
    } catch (error) {
        console.error(`${color.torquise}[${getTimestamp()}] [LATEST_VERSION] Error while retrieving the latest version. No release found. ${color.reset}`);
    }
}

function checkVersion(currentVersion) {
    getLatestVersion().then((latestVersion) => {
        if (currentVersion < latestVersion) {
            console.log(`${color.torquise}[${getTimestamp()}] [LATEST_VERSION] Attention, a new update is available, please install it - https://github.com/Kkkermit/Testify ${color.reset}`);
        } else {
            console.log(`${color.torquise}[${getTimestamp()}] [LATEST_VERSION] You have the latest version of the code. (${config.botVersion}) ${color.reset}`);
        }
    });
}

module.exports = { getLatestVersion, checkVersion };