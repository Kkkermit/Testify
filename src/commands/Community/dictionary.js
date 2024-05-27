const { SlashCommandBuilder, EmbedBuilder }=require('discord.js');
const filter = require('../../jsons/filter.json');

module.exports= {
    data: new SlashCommandBuilder()
    .setName(`dictionary`)
    .setDescription(`This gets the definition and examples of a given word`)
    .addStringOption(option => option.setName('word').setDescription(`This is the word you want to look up`).setRequired(true)), 
    async execute(interaction, client){

        const word = interaction.options.getString('word');

        if (filter.words.includes(word)) return interaction.reply({ content: `${client.config.filterMessage}`, ephemeral: true});

        let data = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)

        if (data.statusText =='Not Found'){
            return interaction.reply({content: `That word **does not** exist`, ephemeral: true});
        }
        
        let info = await data.json();
        let result = info[0];

        let embedInfo = await result.meanings.map((data, index) => {
            let definition = data.definitions[0].definition || 'No definition found';
            let example = data.definitions[0].example || 'No example found';

            return {
                name: data.partOfSpeech.toUpperCase(), 
                value: `\`\`\` Definition: ${definition} \n Example: ${example} \`\`\``, 
            };
        });

        const embed = new EmbedBuilder()
        .setAuthor({ name: `Dictionary Lookup ${client.config.devBy}`})
        .setColor(client.config.embedCommunity)
        .setTitle(`${client.user.username} Dictionary Lookup ${client.config.arrowEmoji}`)
        .setDescription(`> Definition and examples of the word **${word}**`)
        .addFields(embedInfo)
        .setFooter({ text: `Dictionary lookup for ${word}`})
        .setTimestamp()

        await interaction.reply({ embeds: [embed]});
    }
}
