function asciiText(client) {
    const { color, getTimestamp } = require('../utils/loggingEffects.js');

    console.log(`${color.pink}[${getTimestamp()}] ======================================================`);
    console.log(`${color.pink}[${getTimestamp()}] ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗`);
    console.log(`${color.pink}[${getTimestamp()}] ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝`);
    console.log(`${color.pink}[${getTimestamp()}]    ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝ `);
    console.log(`${color.pink}[${getTimestamp()}]    ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝  `);
    console.log(`${color.pink}[${getTimestamp()}]    ██║   ███████╗███████║   ██║   ██║██║        ██║   `);
    console.log(`${color.pink}[${getTimestamp()}]    ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   `);
    console.log(`${color.pink}[${getTimestamp()}] ======================================================`);
    console.log(`${color.pink}[${getTimestamp()}] =========================================================================================================`);
    console.log(`${color.pink}[${getTimestamp()}] ██████╗ ███████╗██╗   ██╗    ██████╗ ██╗   ██╗    ██╗  ██╗██╗  ██╗███████╗██████╗ ███╗   ███╗██╗████████╗`);
    console.log(`${color.pink}[${getTimestamp()}] ██╔══██╗██╔════╝██║   ██║    ██╔══██╗╚██╗ ██╔╝    ██║ ██╔╝██║ ██╔╝██╔════╝██╔══██╗████╗ ████║██║╚══██╔══╝`);
    console.log(`${color.pink}[${getTimestamp()}] ██║  ██║█████╗  ██║   ██║    ██████╔╝ ╚████╔╝     █████╔╝ █████╔╝ █████╗  ██████╔╝██╔████╔██║██║   ██║   `);
    console.log(`${color.pink}[${getTimestamp()}] ██║  ██║██╔══╝  ╚██╗ ██╔╝    ██╔══██╗  ╚██╔╝      ██╔═██╗ ██╔═██╗ ██╔══╝  ██╔══██╗██║╚██╔╝██║██║   ██║   `);
    console.log(`${color.pink}[${getTimestamp()}] ██████╔╝███████╗ ╚████╔╝     ██████╔╝   ██║       ██║  ██╗██║  ██╗███████╗██║  ██║██║ ╚═╝ ██║██║   ██║   `);
    console.log(`${color.pink}[${getTimestamp()}] ╚═════╝ ╚══════╝  ╚═══╝      ╚═════╝    ╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝   ╚═╝   `);
    console.log(`${color.pink}[${getTimestamp()}] =========================================================================================================`);
    console.log(`${color.pink}[${getTimestamp()}] ==================================`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT] ${client.user.username} has been launched!`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT] Watching over ${client.guilds.cache.reduce((a,b) => a+b.memberCount, 0)} members!`);
    console.log(`${color.pink}[${getTimestamp()}] [BOT] Watching over ${client.guilds.cache.size} servers!`);
    console.log(`${color.pink}[${getTimestamp()}] ==================================`);
}

module.exports = asciiText ;