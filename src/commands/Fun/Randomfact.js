const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomfact')
        .setDescription('Sends a random fun fact.'),
    async execute(interaction) {
        const facts = [
            "Honey never spoils.",
            "A day on Venus is longer than a year on Venus.",
            "Octopuses have three hearts.",
            "Bananas are berries, but strawberries aren't.",
            "A group of flamingos is called a 'flamboyance'.",
            "Sloths can hold their breath longer than dolphins by slowing their heart rate.",
            "Some turtles can breathe through their butts."
        ];
        const fact = facts[Math.floor(Math.random() * facts.length)];
        await interaction.reply(`🧠 Fun Fact: ${fact}`);
    },
};
