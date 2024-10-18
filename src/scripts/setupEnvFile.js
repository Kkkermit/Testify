const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { color, getTimestamp } = require('../utils/loggingEffects');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function askRequiredQuestion(query) {
    let answer;
    do {
        answer = await askQuestion(query);
        if (!answer) {
            console.log(`${color.red}[${getTimestamp()}]${color.reset} [ERROR] This field is a required one. Please fill it in to continue.`);
        }
    } while (!answer);
    return answer;
}

console.log(`${color.green}[${getTimestamp()}]${color.reset} [SETUP_ENV] Running setup for environment variables...`);

async function setupEnvironment() {
    const envFile = process.argv.includes('setup-env:dev') ? '.env.development' : '.env';
    const envPath = path.resolve(process.cwd(), envFile);

    const botToken = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your bot token: `);
    const clientId = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your client ID: `);
    const guildId = await askQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] Please enter your guild ID: `);
    const devId = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your developer ID: `);
    const mongoDb = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your MongoDB connection string: `);
    const movieTrackerApi = await askQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] Please enter your Movie Tracker API key: `);
    const rapidApiKey = await askQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] Please enter your RapidAPI key: `);
    const webhookSlashLogging = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your webhook URL for slash command logging: `);
    const webhookPrefixLogging = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your webhook URL for prefix command logging: `);
    const webhookBugLogging = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your webhook URL for error/ bug logging: `);
    const webhookSuggestionLogging = await askRequiredQuestion(`${color.yellow}[${getTimestamp()}]${color.reset} [SETUP_ENV] ${color.red}[REQUIRED]${color.reset} Please enter your webhook URL for suggestion logging: `);

    const envContent = `
token=${botToken}
clientid=${clientId}
guildid=${guildId}
devid=${devId}
mongodb=${mongoDb}
movietrackerapi=${movieTrackerApi}
rapidapikey=${rapidApiKey}

webhookslashlogging=${webhookSlashLogging}
webhookprefixlogging=${webhookPrefixLogging}
webhookbuglogging=${webhookBugLogging}
webhooksuggestionlogging=${webhookSuggestionLogging}
`;

    fs.writeFileSync(envPath, envContent.trim() + '\n');

    console.log(`${color.green}[${getTimestamp()}]${color.reset} [SETUP_ENV_SUCCESS] Environment variables have been added to ${envFile}`);
    rl.close();
}

setupEnvironment();