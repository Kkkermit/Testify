const ascii = require("ascii-table");
const fs = require("fs");
const table = new ascii().setHeading("File Name", "Status");

module.exports = (client) => {
    client.prefixCommands = async (eventFile, path) => {
    
        for (const folder of eventFile) {
            const commands = fs
                .readdirSync(`./src/prefix/${folder}`)
                .filter((file) => file.endsWith(".js"));
    
        for (const file of commands) {
            const command = require(`../prefix/${folder}/${file}`);
    
        if (command.name) {
            client.pcommands.set(command.name, command);
            table.addRow(file, "Loaded");
    
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach((alias) => {
                    client.aliases.set(alias, command.name);
                });
            }
                } else {
                    table.addRow(file, "❌");
                continue;
                }
            }
        }  

        client.logs.info(`[PREFIX_COMMANDS] Started refreshing prefix (?) commands.`);

        const color = {
            red: '\x1b[31m',
            orange: '\x1b[38;5;202m',
            yellow: '\x1b[33m',
            green: '\x1b[32m',
            blue: '\x1b[34m',
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

        console.log(`${color.orange}${table.toString()} \n[${getTimestamp()}] ${color.reset}[PREFIX_COMMANDS] Loaded ${client.pcommands.size} PrefixCommands.`);

        (async () => {
            try {
                client.logs.success(`[PREFIX_COMMANDS] Successfully reloaded prefix (?) commands.`);
            } catch (error) {
                console.error(error);
            }
        })();
    };
};