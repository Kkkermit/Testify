const { color, getTimestamp, textEffects } = require('../utils/loggingEffects.js');

function asciiText(client, startTime) {
    const startupTime = startTime ? `${textEffects.bold}${textEffects.underline} ➜  Ready in: ${Date.now() - startTime}ms${textEffects.reset}` : '';

    console.log(`${color.pink}[${getTimestamp()}] ====================================================== ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗ ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝ ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]    ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝  ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]    ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝   ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]    ██║   ███████╗███████║   ██║   ██║██║        ██║    ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}]    ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝    ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ====================================================== ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ========================================================================================================= ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ██████╗ ███████╗██╗   ██╗    ██████╗ ██╗   ██╗    ██╗  ██╗██╗  ██╗███████╗██████╗ ███╗   ███╗██╗████████╗ ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ██╔══██╗██╔════╝██║   ██║    ██╔══██╗╚██╗ ██╔╝    ██║ ██╔╝██║ ██╔╝██╔════╝██╔══██╗████╗ ████║██║╚══██╔══╝ ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ██║  ██║█████╗  ██║   ██║    ██████╔╝ ╚████╔╝     █████╔╝ █████╔╝ █████╗  ██████╔╝██╔████╔██║██║   ██║    ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ██║  ██║██╔══╝  ╚██╗ ██╔╝    ██╔══██╗  ╚██╔╝      ██╔═██╗ ██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╔╝██║██║   ██║    ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ██████╔╝███████╗ ╚████╔╝     ██████╔╝   ██║       ██║  ██╗██║  ██╗███████╗██║  ██║██║ ╚═╝ ██║██║   ██║    ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ╚═════╝ ╚══════╝  ╚═══╝      ╚═════╝    ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝    ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ========================================================================================================= ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] ================================== ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT] ${client.user.username} has been launched! ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT] Watching over ${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)} members! ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT] Watching over ${client.guilds.cache.size} servers! ${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT]                                  `);
    console.log(`${color.pink}[${getTimestamp()}] [BOT]  ${startupTime}${color.reset}`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT]                                  `);
    console.log(`${color.pink}[${getTimestamp()}] ================================== ${color.reset}`);
}

function asciiTextCommitRunner() {

    console.log(`${color.blue}                                                                                                              ${color.reset}`);
    console.log(`${color.blue}  ██████╗ ██████╗ ███╗   ███╗███╗   ███╗██╗████████╗    ██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗███████╗██████╗  ${color.reset}`);
    console.log(`${color.blue} ██╔════╝██╔═══██╗████╗ ████║████╗ ████║██║╚══██╔══╝    ██╔══██╗██║   ██║████╗  ██║████╗  ██║██╔════╝██╔══██╗ ${color.reset}`);
    console.log(`${color.blue} ██║     ██║   ██║██╔████╔██║██╔████╔██║██║   ██║       ██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝ ${color.reset}`);
    console.log(`${color.blue} ██║     ██║   ██║██║╚██╔╝██║██║╚██╔╝██║██║   ██║       ██╔══██╗██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗ ${color.reset}`);
    console.log(`${color.blue} ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║ ╚═╝ ██║██║   ██║       ██║  ██║╚██████╔╝██║ ╚████║██║ ╚████║███████╗██║  ██║ ${color.reset}`);
    console.log(`${color.blue}  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ${color.reset}`);
    console.log(`${color.blue}                                                                                                              ${color.reset}`);
}

function asciiCodeBaseStats() {

console.log(`${color.blue}                                                                                                                 ${color.reset}`);
console.log(`${color.blue}  ██████╗ ██████╗ ██████╗ ███████╗██████╗  █████╗ ███████╗███████╗    ███████╗████████╗ █████╗ ████████╗███████╗ ${color.reset}`);
console.log(`${color.blue} ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝    ██╔════╝╚══██╔══╝██╔══██╗╚══██╔══╝██╔════╝ ${color.reset}`);
console.log(`${color.blue} ██║     ██║   ██║██║  ██║█████╗  ██████╔╝███████║███████╗█████╗      ███████╗   ██║   ███████║   ██║   ███████╗ ${color.reset}`);
console.log(`${color.blue} ██║     ██║   ██║██║  ██║██╔══╝  ██╔══██╗██╔══██║╚════██║██╔══╝      ╚════██║   ██║   ██╔══██║   ██║   ╚════██║ ${color.reset}`);
console.log(`${color.blue} ╚██████╗╚██████╔╝██████╔╝███████╗██████╔╝██║  ██║███████║███████╗    ███████║   ██║   ██║  ██║   ██║   ███████║ ${color.reset}`);
console.log(`${color.blue}  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ${color.reset}`);
console.log(`${color.blue}                                                                                                                 ${color.reset}`);

}

module.exports = { asciiText, asciiTextCommitRunner, asciiCodeBaseStats };