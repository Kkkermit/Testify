const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const prompts = require('prompts');
const { color, getTimestamp } = require('../utils/loggingEffects.js');

const loadEnvironment = require('./bootMode');
loadEnvironment();

mongoose.set('strictQuery', true);

const mongodbURL = process.env.mongodb;

if (!mongodbURL) {
    console.error(`${color.red}[${getTimestamp()}]${color.reset} MongoDB URL is not set. Please set the mongodb environment variable.`);
    process.exit(1);
}

mongoose.connect(mongodbURL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log())
    .catch(err => {
        console.error(`${color.red}[${getTimestamp()}]${color.reset} Failed to connect to MongoDB`, err);
        process.exit(1);
    });

const schemaNames = fs.readdirSync(path.join(__dirname, '../schemas'))
    .filter(file => file.endsWith('.js'))
    .map(file => file.slice(0, -3));

const choices = schemaNames.map(name => ({ title: name, value: name }));

const schemas = {};
schemaNames.forEach(schemaName => {
    schemas[schemaName] = require(`../schemas/${schemaName}`);
    console.log(`${color.green}[${getTimestamp()}]${color.reset} Loaded schema: ${schemaName}`);
});

async function main() {
    let continueLoop = true;

    while (continueLoop) {
        const actionResponse = await prompts({
            type: 'select',
            name: 'action',
            message: 'What do you want to do?',
            choices: [
                { title: 'Wipe specific schemas', value: 'Wipe specific schemas' },
                { title: 'Wipe entire database', value: 'Wipe entire database' },
                { title: 'Exit', value: 'Exit' },
            ],
        });
        console.log(`${color.purple}[${getTimestamp()}]${color.reset} Selected action: ${actionResponse.action}`);

        if (actionResponse.action === 'Exit') {
            continueLoop = false;
            console.log('Exiting...');
            break;
        }

        if (actionResponse.action === 'Wipe specific schemas') {
            console.log(`${color.blue}[${getTimestamp()}]${color.reset} Choices for schemas:`, choices);
            const schemaResponse = await prompts({
                type: 'multiselect',
                name: 'selectedSchemas',
                message: 'Select the schemas you want to wipe:',
                choices: choices,
                min: 1,
            });

            console.log(`${color.purple}[${getTimestamp()}]${color.reset} Selected schemas: ${schemaResponse.selectedSchemas}`);

            if (schemaResponse.selectedSchemas.length === 0) {
                console.log(`${color.red}[${getTimestamp()}]${color.reset} No schemas selected. Exiting...`);
                continue;
            }

            for (const schemaName of schemaResponse.selectedSchemas) {
                try {
                    console.log(`${color.pink}[${getTimestamp()}]${color.reset} Attempting to wipe ${schemaName} schema...`);
                    const result = await schemas[schemaName].deleteMany({});
                    console.log(`${color.pink}[${getTimestamp()}]${color.reset} Wiped ${schemaName} schema. Deleted ${result.deletedCount} documents.`);
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}]${color.reset} Failed to wipe ${schemaName} schema:`, error);
                }
            }
        } else if (actionResponse.action === 'Wipe entire database') {
            for (const schemaName in schemas) {
                try {
                    console.log(`${color.pink}[${getTimestamp()}]${color.reset} Attempting to wipe ${schemaName} schema...`);
                    const result = await schemas[schemaName].deleteMany({});
                    console.log(`${color.pink}[${getTimestamp()}]${color.reset} Wiped ${schemaName} schema. Deleted ${result.deletedCount} documents.`);
                } catch (error) {
                    console.error(`${color.red}[${getTimestamp()}]${color.reset} Failed to wipe ${schemaName} schema:`, error);
                }
            }
        }

        const continueResponse = await prompts({
            type: 'select',
            name: 'continue',
            message: 'Do you want to exit or go back to the main menu?',
            choices: [
                { title: 'Go back to main menu', value: 'main' },
                { title: 'Exit', value: 'exit' },
            ],
        });

        if (continueResponse.continue === 'exit') {
            continueLoop = false;
            console.log(`${color.red}[${getTimestamp()}]${color.reset} Exiting...`);
            process.exit(0);
        }
    }
}

main().catch(err => {
    console.error(`${color.red}[${getTimestamp()}]${color.reset} Error in main function:`, err);
    process.exit(1);
});