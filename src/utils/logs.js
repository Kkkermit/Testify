const { inspect } = require('node:util');
const { color, getTimestamp } = require('../utils/loggingEffects.js');

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

// idk if this will cause any orther problems but i just didnt liked the ending terminal to always stay red <3
function error(message) {
	return console.log(`${color.red}[${getTimestamp()}] ${message}${color.reset}`);
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

function torquise(message) {
    return write(message, `${color.torquise}[${getTimestamp()}]${color.reset} `);
}

function purple(message) {
    return write(message, `${color.purple}[${getTimestamp()}]${color.reset} `);

}

module.exports = { write, info, warn, error, success, debug, logging, torquise, purple };