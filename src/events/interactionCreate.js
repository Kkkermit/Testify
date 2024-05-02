const { Interaction, EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) return
        
        try{

            await command.execute(interaction, client);
        } catch (error) {

            client.logs.error(error);

            const embed = new EmbedBuilder()
            .setColor("Red")
            .setDescription(`There was an error while executing this command!\n\`\`\`${error}\`\`\``)

            await interaction.reply({
                embeds: [embed] , 
                ephemeral: true
            });
        } 

    },
    

};