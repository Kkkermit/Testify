<!--     ████████╗███████╗███████╗████████╗██╗███████╗██╗   ██╗
         ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝
            ██║   █████╗  ███████╗   ██║   ██║█████╗   ╚████╔╝
            ██║   ██╔══╝  ╚════██║   ██║   ██║██╔══╝    ╚██╔╝
            ██║   ███████╗███████║   ██║   ██║██║        ██║
            ╚═╝   ╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝        ╚═╝    -->

<img align="center" alt="Nub Bot banner" src="https://i.postimg.cc/v87R8PSx/test.png">

<p align="center">
<img align="center" alt="GitHub Issues" src="https://img.shields.io/github/issues/Kkkermit/Testify?style=for-the-badge"> 
<img align="center" alt="GitHub license" src="https://img.shields.io/github/license/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub Stars" src="https://img.shields.io/github/stars/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub Forks" src="https://img.shields.io/github/forks/Kkkermit/Testify?style=for-the-badge">
<img align="center" alt="GitHub Contributors" src="https://img.shields.io/github/contributors/Kkkermit/Testify.svg?style=for-the-badge">
<img align="center" alt="GitHub Watchers" src="https://img.shields.io/github/watchers/Kkkermit/Testify?style=for-the-badge">
</p>

<p align="center">
  <a href="https://buymeacoffee.com/kkermit" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60px" width="217px">
  </a>
</p>


<p align="center"><strong>
Advanced all-in-one discord bot with prefix & slash commands
</strong></p>

<p align="center">
With over 100 slash commands and over 50 prefix commands, Testify is an open source discord bot that's easy to set up and use and full of fun features for your servers!
</p>

> To test out Testify, be sure to invite him to your server by clicking [here](https://discord.com/oauth2/authorize?client_id=1211784897627168778&permissions=8&scope=applications.commands%20bot)

> [!CAUTION]
> **Never share or commit your `.env` file or any of its values!** These contain sensitive information including your bot token, MongoDB credentials, and API keys that could be used to compromise your systems or incur unwanted charges if leaked. Always add `.env` to your `.gitignore` file.

## Table of Contents
- [Features](#features)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [Usage](#usage)
- [Command Categories](#command-categories)
- [Setting-Audit-Logs](#Setting-up-audit-logs)
- [Technical Features](#technical-features)
- [Contributors](#contributors)
- [Support](#support)
- [License](#license)

<h1 align="center"><strong>
⭐ If you're a fan of this repository or have used it or any of its code, please consider leaving us a star. It would be greatly appreciated and allows us to see if users value the bot! ⭐
</strong></h1>

## Features

### Moderation Tools
- **Complete Moderation Suite**: Ban, kick, timeout, warn, and mute functionality
- **Auto-moderation**: Filter profanity, spam, and inappropriate content
- **Audit Logging**: Comprehensive logging of all moderation actions
- **Ticket System**: Create and manage support tickets with transcripts

### Entertainment & Fun
- **Music System**: Play music from YouTube, Spotify, and SoundCloud with queue management
- **Leveling System**: XP and ranking system with customizable rewards
- **Mini-games**: Variety of games including RPS, coinflip, 8ball, and more
- **Meme Commands**: Random memes, jokes, and fun interactions

### Information & Utility
- **User Info**: Detailed user information with profile cards
- **Server Info**: Server statistics and information
- **Role Info**: Detailed role information including permissions
- **Profile System**: Create and customize user profiles

### Integration & API Features
- **Valorant Integration**: View skins, store, and player info
- **Instagram Notifications**: Get notified of new posts from Instagram accounts
- **Spotify Integration**: Advanced Spotify tracking and integration
- **Weather Information**: Get weather forecasts for any location

### Customization
- **Custom Prefix**: Set a custom prefix for your server
- **Custom Embeds**: Create and customize rich embeds
- **Announcement System**: Create professional announcements
- **Thread Management**: Create and manage threads

## Compatibility

### System Requirements

| Operating System | Support Status | Notes |
|------------------|---------------|-------|
| Windows 11       | ✅ Full Support | Recommended for development |
| Windows 10       | ✅ Full Support | Recommended for development |
| macOS            | ✅ Full Support | Tested on macOS Ventura+ |
| Linux (Ubuntu)   | ✅ Full Support | Tested on Ubuntu 20.04 LTS+ |
| Linux (Debian)   | ✅ Full Support | Tested on Debian 11+ |
| Linux (CentOS)   | ✅ Full Support | Tested on CentOS 8+ |
| Linux (Fedora)   | ✅ Full Support | Tested on Fedora 34+ |

### Node.js Support

| Node.js Version | Support Status | Notes |
|-----------------|---------------|-------|
| v18.13.0+       | ✅ Supported | Minimum required version |
| v19.x           | ✅ Supported | |
| v20.x           | ✅ Supported | Recommended for best performance |
| v21.x           | ✅ Supported | Latest features |

> [!IMPORTANT]
> **If you're struggling to use a certain node version, I'd suggest either downgrading or upgrading your version using nvm**
> To install nvm, please follow this [**link**](https://www.freecodecamp.org/news/node-version-manager-nvm-install-guide/).

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


- **Setting up the env file**

    *If you go along with this, you can ignore the parts in the `Project Execution` that explain how to generate and fill in the `.env`*

    1. For easy setup of the env files, ( `.env` & `.development.env` ) you can run the command `npm run setup-env:prod`
    2. Once you've ran the command, it generates a script in the console
    3. You need to then fill out the fields in the console. Fields marked with the text **"Required"** are you required fields and you need to fill those ones in. The script will not continue if you ignore to fill in those fields. 
    4. Once you've filled in the field, it will write those fields into and generate the `.env`.
    5. Alternatively, you can ignore this and fill in the fields yourself by viewing the `.example.env` file.
    6. If you then want to setup the `.env.development` file, you can run the command `npm run setup-env:dev` and follow the steps above again.


- **Project Execution**

    1. Rename the filed named `example.env` to `.env`
    2. Navigate to the `Bot` page on the [Discord Developer Portal](https://discord.com/developers/applications) and click `Reset Token`. Afterwards, create a `.env` file within the root directory.
    3. Paste your bot token into the `token` variable inside the `.env` file.
    4. Paste your [MongoDB](https://www.mongodb.com) connection string into the `mongodb` variable inside the `.env` file.
    5. Navigate to the `OAuth2` page and copy the `CLIENT ID`. 
    6. Paste your client ID into the `clientid` variable inside the `.env` file.
    7. Navigate to your discord server, enable developer mode and right click the dropdown beside the server name. 
    8. Click `Copy Server ID` and paste it into the `guildid` variable inside the `.env` file.
    9. Visit the [Spotify web API docs](https://developer.spotify.com/documentation/web-api) and sign in. Once signed in, navigate to dashboard. Once on here, you'll need to create an app. Fill out the steps on the site to create your app. Once created, you'll need to copy your clientid and client secret into the `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET` fields in the `.env` file. You can leave the `SPOTIFY_REDIRECT_URI` as it is. Only change this if you're updating the port of the Spotify server.
    10. Navigate to the `package.json` file and pay attention to the runnable commands listed under `scripts`.
    11. Open the terminal in [Visual Studio Code](https://code.visualstudio.com/download) and install all necessary packages using `npm run setup`. This will install the dependencies and give you a brief install guide
    12. Open a new terminal and type `npm run prod` to run the file without using **nodemon** or `npm run prod:nodemon` to run the bot with nodemon.
    13. The bot should then turn online, you should be able to see this by the console logs that is setup upon start up

- **Runnable commands (scripts)**

   **Wipe Database** - <br>
   To wipe the database that is connected via your mongoDB url, you can run the command `npm run wipe-data:prod`, this brings up a menu which you can follow in order to either wipe the entire database from all it's data, or wipe all the data from individual schemas. 

   **Update Packages** - <br>
   To update all your dependencies, you can run the command `npm run update-packages`, this cycles through the dependencies and updates one's which are out of date.

   **update-ytdl-core** - <br>
   To update the version of the `ytdl-core` package, you can run the command `npm run update-ytdl-core`, this updates the package to the most recent version to ensure the music system works.

   **setup-env:prod** - <br>
   To run the setup of the `.env` file you can run the command `npm run setup-env:prod`, this generates a script in the console that generates a `.env` file and where you fill out the fields with whats required for the `.env` file and it writes it in the file.

   **setup-env:dev** - <br>
   To run the setup of the `.env.development` file you can run the command `npm run setup-env:dev`, this generates a script in the console that generates a `.env.development` file and where you fill out the fields with whats required for the `.env.development` file and it writes it in the file.

   **log-setup** - <br>
   To run the setup of the colored logs in the `discord-logs` module. This saves you from manually doing the below method [Setting-up-audit-logs](#setting-up-audit-logs)

   **codebase-info** - <br>
   This displays some info of the codebase like how many lines of code are in the src directory, how many comments and how many files there are.

## Command Categories

### Slash Command Categories

| Category Name | Description |
|--------------|-------------|
| AiCommands | AI-based commands for chat responses, image generation and analysis |
| AuditLogging | Configuration for server audit logging |
| Automod | Automated moderation tools to filter content |
| Community | General utility commands for the community |
| Devs | Developer-specific tools and utilities |
| Economy | Currency and economic system commands |
| Fun | Entertainment and amusement commands |
| Giveaway | Tools for running server giveaways |
| Help | Documentation and assistance commands |
| InfoCommands | Information retrieval tools |
| InstaNotification | Instagram post tracking system |
| LevelAndEconomy | Experience and economy management |
| LevelSystem | User level progression system |
| MiniGames | Various interactive games |
| Other | Miscellaneous commands |
| Owner | Bot owner administration commands |
| PrefixSettings | Configuration for custom prefixes |
| Profile | User profile management system |
| Spotify | Spotify integration and tracking |
| Valorant | Valorant game information and tracking |

### Prefix Command Categories

| Category Name | Description |
|--------------|-------------|
| Dev | Developer-specific tools and debug commands |
| EconomyCommands | Currency system management commands |
| FunCommands | Entertainment and amusing interactions |
| InfoCommands | Information retrieval commands |
| LevelCommands | User progression and level management |
| ModerationCommands | Server moderation and administration tools | 
| Music | Audio playback and music commands |
| OwnerCommands | Bot owner-only administrative commands |
| TestCommands | Testing and experimental features |
| UtilityCommands | General utility and helper commands |

## Setting-up-audit-logs

To set the advanced logs registry for the Testify audit-logs ( the event handler registers ) than follow this!

   1. Navigate to `node_modules` **=>** `discord-logs` **=>** `lib` **=>** `index.js` 
   2. Once in the `index.js` file for the discord logs package you'll want to **copy and paste** this code in below.

   ```js
    "use strict";
    var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? P : new P(function (resolve) { resolve(value); }); }
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

## Technical Features

### Console Logger
- **Discord Webhook Integration**: All console output is sent to a Discord webhook for remote monitoring
- **Rate Limiting**: Intelligent handling of Discord API rate limits to prevent errors
- **Message Batching**: Efficiently batches messages to reduce API calls
- **Error Handling**: Robust error handling with proper logging

### Database Integration
- **MongoDB Integration**: Complete database integration for persistent data storage
- **Schema System**: Well-organized schema system for all bot functionality
- **Data Management**: Tools for data management and backup

### API Integrations
- **Valorant API**: Integration with Valorant API for game data
- **Spotify API**: Integration with Spotify API for music data
- **Instagram API**: Integration for tracking Instagram posts
- **Weather API**: Integration for weather forecasts

### Performance Optimization
- **Command Handler**: Efficient command handling for both prefix and slash commands
- **Event Manager**: Comprehensive event management system
- **Process Management**: Proper handling of process events and termination

## Contributors

<p align="center">Thank you to all the amazing people who have contributed to Testify!</p>

<p align="center">
  <a href="https://github.com/Kkkermit/Testify/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=Kkkermit/Testify" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/Kkkermit/Testify/graphs/contributors">View all contributors</a>
</p>

## Support

Connect with us on [Discord](https://discord.gg/xcMVwAVjSD) for support / any related inquiry.

## License
Released under the terms of [MIT License](https://github.com/Kkkermit/Testify/blob/main/LICENSE) license.

**Thanks to [TheLegendDev](https://github.com/TheLegenDev) for the readme template from [Nub Bot](https://github.com/TheLegenDev/Nub-Bot)** 💛
