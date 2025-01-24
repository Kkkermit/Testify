const ascii = require("ascii-table");
const fs = require("fs");
const table = new ascii().setHeading("File Name", "Status");
const { color, getTimestamp } = require('../utils/loggingEffects.js');

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

        console.log(`${color.orange}${table.toString()} \n[${getTimestamp()}] ${color.reset}[PREFIX_COMMANDS] Found ${client.pcommands.size} PrefixCommands.`);

        (async () => {
            try {
                client.logs.success(`[PREFIX_COMMANDS] Successfully reloaded prefix (?) commands.`);
            } catch (error) {
                console.error(error);
            }
        })();
    };
};