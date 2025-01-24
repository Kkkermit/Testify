const { exec } = require('child_process');
const { color, getTimestamp } = require('../utils/loggingEffects'); 

console.log(`${color.torquise}[${getTimestamp()}]${color.reset} [UPDATING_PACKAGE] Updating the @distube/ytdl-core package...`);

exec('npm update @distube/ytdl-core', (error, stderr) => {
    if (error) {
        console.error(`${color.red}[${getTimestamp()}] [UPDATING_PACKAGE] Error updating @distube/ytdl-core: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`${color.orange}[${getTimestamp()}]${color.reset} [UPDATING_PACKAGE] Package is already up to date.`);
        return;
    }
    console.log(`${color.torquise}[${getTimestamp()}]${color.reset} [UPDATING_PACKAGE] @distube/ytdl-core package updated successfully.`);
});