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


## Support
Connect with us on [Discord](https://discord.gg/xcMVwAVjSD) for support / any related inquiry.

## License
Released under the terms of [MIT License](https://github.com/Kkkermit/Testify/blob/main/LICENSE) license.

**Thanks to [TheLegendDev](https://github.com/TheLegenDev) for the readme template from [Nub Bot](https://github.com/TheLegenDev/Nub-Bot)** 💛
