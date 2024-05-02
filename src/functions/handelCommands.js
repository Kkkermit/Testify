const { REST } = require("@discordjs/rest");
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const ascii = require("ascii-table");
const table = new ascii().setHeading("File Name", "Status");

const clientId = process.env.clientid; 
const guildId = process.env.guildid; 

module.exports = (client) => {
    client.handleCommands = async (commandFolders, path) => {
        client.commandArray = [];
        for (folder of commandFolders) {
            const commandFiles = fs.readdirSync(`${path}/${folder}`).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(`../commands/${folder}/${file}`);
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());

                if (command.name) {
                    client.commands.set(command.name, command);
                    table.addRow(file, "Loaded");
            
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach((alias) => {
                            client.aliases.set(alias, command.name);
                        });
                    }
                } else {
                    table.addRow(file, "Loaded");
                    continue;
                }
            }
        }

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

        console.log(`${color.blue}${table.toString()} \n[${getTimestamp()}] ${color.reset}[COMMANDS] Loaded ${client.commands.size} SlashCommands.`);

        const rest = new REST({
            version: '9'
        }).setToken(process.env.token);

        (async () => {
            try {
                client.logs.info(`[FUNCTION] Started refreshing application (/) commands.`);

                await rest.put(
                    Routes.applicationCommands(clientId), {
                        body: client.commandArray
                    },
                );

                client.logs.success(`[FUNCTION] Successfully reloaded application (/) commands.`);
            } catch (error) {
                console.error(error);
            }
        })();
    };
};