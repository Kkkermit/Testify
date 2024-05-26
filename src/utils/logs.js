const { inspect } = require('node:util');

const color = {
    red: '\x1b[31m',
    orange: '\x1b[38;5;202m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    pink: '\x1b[38;5;213m',
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

function write(message = '', prefix = '', colors = true) {
    const properties = inspect(message, { depth: 3, colors: Boolean(colors && typeof message !== 'string') });

    const regex = /^\s*["'`](.*)["'`]\s*\+?$/gm;

    const lines = properties.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(regex, '$1');
        if (i === 0) {
            console.log(prefix + line);
        } else {
            console.log(line);
        }
    }
}

function info(message) {
    return write(message, `${color.yellow}[${getTimestamp()}]${color.reset} `);
}

function warn(message) {
    return write(message, `${color.orange}[${getTimestamp()}]${color.reset} `);
}

function error(message) {
    return write(message, `${color.red}[${getTimestamp()}] `, false);
}

function success(message) {
    return write(message, `${color.green}[${getTimestamp()}]${color.reset} `);
}

function debug(message) {
    return write(message, `${color.blue}[${getTimestamp()}]${color.reset} `);
}

function logging(message) {
    return write(message, `${color.pink}[${getTimestamp()}]${color.reset} `);
}

module.exports = { getTimestamp, write, info, warn, error, success, debug, logging, color};