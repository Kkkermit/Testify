const { SlashCommandBuilder, EmbedBuilder, MessageFlags }= require('discord.js');
const wiki = require('wikijs').default();
const filter = require('../../jsons/filter.json');

module.exports = {
    usableInDms: true,
    category: "Community",
    data: new SlashCommandBuilder() 
    .setName('wiki')
    .setDescription('Ask Wiki a question')
    .addStringOption(option => option.setName(`query`).setDescription(`Look something up on Wiki`).setRequired(true)),
    async execute(interaction, client){
        
        const query = interaction.options.getString(`query`);

        if (filter.words.includes(query)) return interaction.reply({ content: `${client.config.filterMessage}`, flags: MessageFlags.Ephemeral});

        await interaction.deferReply();

        const search = await wiki.search(query);
        if (!search.results.length) return await interaction.editReply({ content: `Wikipedia doesn't seem to know what you are talking about...`, flags: MessageFlags.Ephemeral});

        const result = await wiki.page(search.results[0]);

        const summary = await result.summary();
        if (summary.length > 8192) return await interaction.editReply({content: `${summary.slice(0, 1020)}`, flags: MessageFlags.Ephemeral });
        else {
            const embed=new EmbedBuilder()
            .setAuthor({ name: `Wiki Command ${client.config.devBy}`})
            .setThumbnail(client.user.avatarURL())
            .setURL(result.raw.fullurl)
            .setTimestamp()
            .setColor(client.config.embedCommunity)
            .setTitle(`${client.user.username} Wiki Tool ${client.config.arrowEmoji}`)
            .setDescription(`Wiki search: ${result.raw.title}`)
            .addFields({ name: `Result`, value: `\`\`\`${summary.slice(0, 1020)}\`\`\``})
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true })});
            await interaction.editReply({ embeds: [embed]});
        }
    }
}