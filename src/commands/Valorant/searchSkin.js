const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('search-skin')
    .setDescription('search a skin by its name')
    .addStringOption(opt => opt
        .setName('name')
        .setDescription('Name of the skin to search!')
        .setRequired(true)
        .setAutocomplete(true)
    ),
    autocomplete: async function(interaction, client) {
        const focused = interaction.options.getFocused(true);

        if (focused.name === 'name') {
            let skins = [];

            if (focused.value) {
                skins = client.skins.filter(s => s["displayName"]["de-DE"].toLowerCase().includes(focused.value.toLowerCase()) || s["displayName"]["en-US"].toLowerCase().includes(focused.value.toLowerCase()));
            }

            interaction.respond( skins.slice(0, 25).map(d => ({ name: d["displayName"]["en-US"], value: d["uuid"] })) );
        }
    },
    async execute(interaction, client) {
        const skinUUID = interaction.options.getString('name');

        const foundSkin = client.skins.find(s => s["uuid"] === skinUUID);

        if (!foundSkin) return interaction.reply({ content: 'Skin not found!', ephemeral: true });

        const skinTier = client.skinsTier.find(s => s["uuid"] === foundSkin["contentTierUuid"]) || {
            highlightColor: "808080FF",
            displayIcon: null,
            price: 0
        };

        const Embed = new EmbedBuilder()
        .setAuthor({ name: `Valorant Skin Search | Developed by arnsfh`, iconURL: "https://i.postimg.cc/RVzrNstM/arnsfh.webp" })
        .setTitle(`${client.user.username} Valorant Skin Search ${client.config.arrowEmoji}`)
        .setColor(`#${skinTier["highlightColor"].slice(0, -2)}` || "DarkerGrey")
        .setThumbnail(skinTier["displayIcon"])
        .setImage(foundSkin["displayIcon"] || foundSkin["levels"][0]["displayIcon"])
        .setFooter({ text: `Valorant Skin Search`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp()
        .setDescription(`> **${foundSkin["displayName"]["en-US"]}** \n\nPrice: **${!foundSkin["displayName"]["en-US"].includes('Knife') ? skinTier["price"] || 0 : "1750 - 5950"}** ${client.config.valoPoints}`)

        await interaction.reply({ embeds: [Embed] });
    }
}