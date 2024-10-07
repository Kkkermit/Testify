<!--     ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
         ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
            ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝
            ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝
            ██║   ███████╗███████║   ██║   ██║██║        ██║
            ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝    -->

<img align="center" alt="Nub Bot banner" src="https://i.postimg.cc/v87R8PSx/test.png">

<p align="center">
<img align="center" alt="GitHub issues" src="https://img.shields.io/github/issues/Kkkermit/Testify?style=for-the-badge"> 
<img align="center" alt="GitHub license" src="https://img.shields.io/github/license/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub license" src="https://img.shields.io/github/stars/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub license" src="https://img.shields.io/github/forks/Kkkermit/Testify?style=for-the-badge">
</p>

<p align="center"><strong>
Advanced all-in-one discord bot with prefix & slash commands
</strong></p>

<p align="center">
With over 100 slash command and over 50 prefix commands, Testify is an open source discord bot that's easy to set up and use and full of fun features to use for your servers!
</p>

> To test out Testify, be sure to invite him to your server by clicking [here](https://discord.com/oauth2/authorize?client_id=1211784897627168778&permissions=8&scope=applications.commands%20bot)

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Setting-Audit-Logs](#Setting-up-audit-logs)
- [Support](#support)
- [License](#license)

<h1 align="center"><strong>
⭐ If your a fan of this repository or have used it or any of it's code, please consider leaving us a star. It would be greatly appreciated and allows us to see if users value the bot! ⭐
</strong></h1>

## Installation
- Download [Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
- Download [Visual Studio Code](https://code.visualstudio.com/download).

## Usage
- **Project Setup**

    1. Fork the Github project :
       1. Sign up / Sign in to [GitHub](https://github.com/).
       2. Navigate to [Testify](https://github.com/Kkkermit/Testify).
       3. Click `Star` to support development.
       4. Click `Fork` to copy all code to your own repository.
   
    2. Click the `Code` button. From the drop-down that appears, click `Download ZIP` to download the entire repository as a ZIP folder.

    3. Extract the files to a new folder and open it with [Visual Studio Code](https://code.visualstudio.com/download).


- **Obtain Discord Bot Token**

    1. Sign in to [Discord Developer Portal](https://discord.com/developers/applications).

    2. Create a bot :
        1. Enter the left side `Applications`.
        2. Click `New Application` in the upper right corner and enter the name of the bot. After confirmation, enter the new page.
        3. Click on the left side `Bot`.
        4. Enable all intents listed under `Privileged Gateway Intents` and click `Save Changes`.
        5. View and copy the token by clicking the `Reset Token` button.
   
    3. Set up OAuth2 :
        1. Click on `OAuth2` in the left column.
        2. Click on `URL Generator` in the left column.
        3. In the right column, select `bot` and `applications.commands` under `SCOPES`.
        4. Scroll down and select `Administrator` under `BOT PERMISSIONS`.
        5. Copy the URL at the bottom and paste it into your browser.
        6. Choose the server you want to add the bot to and click `Continue` > `Authorize`.


- **Obtain MongoDB Connection String**

    1. Sign up / Sign in to [MongoDB](https://www.mongodb.com).
    2. Choose your preferred cloud database plan.
    3. Customize the cluster settings to your preference and click `Create Cluster`.
    4. Navigate to the `Network Access` page, click `Add IP Address` and select `Allow access from anywhere`.
    5. Navigate back to the `Database` page and click `Connect`.
    6. Create a `database user`, click `Choose a connection method` and select `Connect your application`.
    7. Copy your connection string and replace `<password>` with the password for the database user that you created earlier.


- **Project Execution**

    1. Rename the filed named `example.env` to `.env`
    2. Navigate to the `Bot` page on the [Discord Developer Portal](https://discord.com/developers/applications) and click `Reset Token`. Afterwards, create a `.env` file within the root directory.
    3. Paste your bot token into the `token` variable inside the `.env` file.
    4. Paste your [MongoDB](https://www.mongodb.com) connection string into the `mongodb` variable inside the `.env` file.
    5. Navigate to the `OAuth2` page and copy the `CLIENT ID`. 
    6. Paste your client ID into the `clientid` variable inside the `.env` file.
    7. Navigate to your discord server, enable developer mode and right click the dropdown beside the server name. 
    8. Click `Copy Server ID` and paste it into the `guildid` variable inside the `.env` file.
    9. Navigate to the `package.json` file and pay attention to the runnable commands listed under `scripts`.
    10. Open the terminal in [Visual Studio Code](https://code.visualstudio.com/download) and install all necessary packages using `npm run setup`. This will install the dependencies and give you a brief install guide
    11. Open a new terminal and type `npm run prod` to run the file without using **nodemon** or `npm run prod:nodemon` to run the bot with nodemon.
    12. The bot should then turn online, you should be able to see this by the console logs that is setup upon start up

- **Runnable commands (scripts)**

   **Wipe Database** - <br>
   To wipe the database that is connected via your mongoDB url, you can run the command `npm run wipe-data:prod`, this brings up a menu which you can follow in order to either wipe the entire database from all it's data, or wipe all the data from individual schemas. 

   **Update Packages** - <br>
   To update all your dependencies, you can run the command `npm run update-packages`, this cycles through the dependencies and updates one's which are out of date.

## Setting-up-audit-logs

To set the advanced logs registry for the Testify audit-logs ( the event handler registers ) than follow this!

   1. Navigate to `node_modules` **=>** `discord-logs` **=>** `lib` **=>** `index.js` 
   2. Once in the `index.js` file for the discord logs package you'll want to **copy and paste** this code in below.

   ```js
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    const color = {
        red: '\x1b[31m',
        orange: '\x1b[38;5;202m',
        yellow: '\x1b[33m',
        green: '\x1b[32m',
        blue: '\x1b[34m',
        reset: '\x1b[0m',
        pink: '\x1b[38;5;213m'
    }

    function getTimestamp() {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const discord_js_1 = require("discord.js");
    const handlers_1 = require("./handlers");
    let eventRegistered = false;
    module.exports = (client, options) => __awaiter(void 0, void 0, void 0, function* () {
        if (eventRegistered)
            return;
        eventRegistered = true;
        const intents = new discord_js_1.IntentsBitField(client.options.intents);
        /* HANDLE GUILDS EVENTS */
        if (intents.has(discord_js_1.IntentsBitField.Flags.Guilds)) {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] ChannelUpdate event handler registered.`);
            client.on('channelUpdate', (oldChannel, newChannel) => {
                (0, handlers_1.handleChannelUpdateEvent)(client, oldChannel, newChannel);
            });
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] GuildUpdate event handler registered.`);
            client.on('guildUpdate', (oldGuild, newGuild) => {
                (0, handlers_1.handleGuildUpdateEvent)(client, oldGuild, newGuild);
            });
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] RoleUpdate event handler registered.`);
            client.on('roleUpdate', (oldRole, newRole) => {
                (0, handlers_1.handleRoleUpdateEvent)(client, oldRole, newRole);
            });
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] ThreadUpdate event handler registered.`);
            client.on('threadUpdate', (oldThread, newThread) => {
                (0, handlers_1.handleThreadChannelUpdateEvent)(client, oldThread, newThread);
            });
        }
        else {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`channelUpdate, guildUpdate, roleUpdate and threadUpdate event handlers not registered (missing Guilds intent).`);
        }
        /* HANDLE MEMBER EVENTS */
        if (intents.has(discord_js_1.IntentsBitField.Flags.GuildMembers)) {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] GuildMemberUpdate event handler registered.`);
            client.on('guildMemberUpdate', (oldMember, newMember) => {
                (0, handlers_1.handleGuildMemberUpdateEvent)(client, oldMember, newMember);
            });
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] UserUpdate event handler registered.`);
            client.on('userUpdate', (oldUser, newUser) => {
                (0, handlers_1.handleUserUpdateEvent)(client, oldUser, newUser);
            });
        }
        else {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log('guildMemberUpdate, userUpdate event handlers not registered (missing GuildMembers intent).');
        }
        /* HANDLE MESSAGE UPDATE EVENTS */
        if (intents.has(discord_js_1.IntentsBitField.Flags.GuildMessages && discord_js_1.IntentsBitField.Flags.MessageContent)) {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] MessageUpdate event handler registered.`);
            client.on('messageUpdate', (oldMessage, newMessage) => {
                (0, handlers_1.handleMessageUpdateEvent)(client, oldMessage, newMessage);
            });
        }
        else {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log('messageUpdate event handler not registered (missing GuildMessages or MessageContent intent).');
        }
        /* HANDLE PRESENCE UPDATE EVENTS */
        if (intents.has(discord_js_1.IntentsBitField.Flags.GuildPresences)) {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] PresenceUpdate event handler registered.`);
            client.on('presenceUpdate', (oldPresence, newPresence) => {
                (0, handlers_1.handlePresenceUpdateEvent)(client, oldPresence, newPresence);
            });
        }
        else {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log('presenceUpdate event handler not registered (missing GuildPresences intent).');
        }
        /* HANDLE VOICE STATE UPDATE */
        if (intents.has(discord_js_1.IntentsBitField.Flags.GuildVoiceStates)) {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log(`${color.pink}[${getTimestamp()}] ${color.reset}[AUDIT_LOGS] VoiceStateUpdate event handler registered.`);
            client.on('voiceStateUpdate', (oldState, newState) => {
                (0, handlers_1.handleVoiceStateUpdateEvent)(client, oldState, newState);
            });
        }
        else {
            if (options === null || options === void 0 ? void 0 : options.debug)
                console.log('voiceStateUpdate event handler not registered (missing GuildVoiceStates intent).');
        }
    });
   ```
   3. This code makes the logs register like so this image below <img align="center" alt="Audit-logs" src="https://i.postimg.cc/NMJfsy0V/Screenshot-2024-10-07-184919.png">
   4. To update the color of the logs, you can change the part `${color.pink}` to the color you'd like which are defined in the color variable. 
   5. That should be it, now when you start up the bot, it should look all cool 😎

## Support
Connect with us on [Discord](https://discord.gg/xcMVwAVjSD) for support / any related inquiry.

## License
Released under the terms of [MIT License](https://github.com/Kkkermit/Testify/blob/main/LICENSE) license.

**Thanks to [TheLegendDev](https://github.com/TheLegenDev) for the readme template from [Nub Bot](https://github.com/TheLegenDev/Nub-Bot)** 💛
