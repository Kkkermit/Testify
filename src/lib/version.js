const axios = require('axios');
const config = require('../config')

const color = {
    red: '\x1b[31m',
    orange: '\x1b[38;5;202m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    pink: '\x1b[38;5;213m',
    torquise: '\x1b[38;5;45m',
    reset: '\x1b[0m'
}

function getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

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
            console.log(`${color.torquise}[${getTimestamp()}] [LATEST_VERSION] Attention, a new update is available, please install it - https://github.com/Kkkermit/Testify`);
        } else {
            console.log(`${color.torquise}[${getTimestamp()}] [LATEST_VERSION] You have the latest version of the code. (${config.botVersion})`);
        }
    });
}

module.exports = { getLatestVersion, checkVersion };