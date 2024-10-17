function asciiText(client) {
    const { color, getTimestamp } = require('../utils/loggingEffects.js');

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
    console.log(`${color.pink}[${getTimestamp()}] ================================== ${color.reset}`);
}

module.exports = asciiText ;