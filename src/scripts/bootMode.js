const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvironment() {
    const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
    const envPath = path.resolve(process.cwd(), envFile);

    console.log(`${color.green}[${getTimestamp()}]${color.reset} [PROCESS] Loading environment variables from: ${envPath}`);
    if (process.env.NODE_ENV === 'development') { 
        console.log(`${color.green}[${getTimestamp()}]${color.reset} [PROCESS] ${process.env.NODE_ENV} mode has been loaded!`);
    } else {
        console.log(`${color.green}[${getTimestamp()}]${color.reset} [PROCESS] Non-development mode has been loaded!`);
    }

    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    } else {
        console.error(`${color.red}[${getTimestamp()}] [ERROR] Environment file ${envFile} not found`, error);
        process.exit(1);
    }
}

const color = {
    red: '\x1b[31m',
    green: '\x1b[32m',
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
};

module.exports = loadEnvironment;