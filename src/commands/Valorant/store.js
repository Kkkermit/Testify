const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ValoAPI = require('../../api/valorantApi');
const ValorantUser = require('../../schemas/valorantUserSystem');
const images = require('../../images');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('store')
        .setDescription('see your valorant store'),
    async execute(interaction, client) {

        const userAccount = await ValorantUser.findOne({ userId: interaction.user.id });

        if (!userAccount) return interaction.reply({ content: 'No account found! use /login', ephemeral: true });

        if (Date.now() > userAccount.expires.getTime()) return interaction.reply({ content: 'Account access token expired! use /login', ephemeral: true });

        const valApi = new ValoAPI({ 
            SkinsData: client.skins, 
            SkinsTier: client.skinsTier, 
            accessToken: userAccount.accessToken, 
            entitlementToken: userAccount.entitlementToken, 
            userUUID: userAccount.userUUID 
        });

        await valApi.initialize();

        const wallet = await valApi.getWallet();
        const { StoreSkins, NewStore } = await valApi.getStore();

        let Embeds = [
            new EmbedBuilder()
                .setAuthor({ name: 'Valorant Store | Developed by arnsfh', iconURL: "https://i.postimg.cc/RVzrNstM/arnsfh.webp" })
                .setTitle(`${client.user.username} Valorant Store ${client.config.arrowEmoji}`)
                .setColor('LightGrey')
                .setDescription(`> **__${interaction.user.username}'s Store__** \n\n**${wallet}**\n\nNext Store in <t:${Math.floor(NewStore)}:R>`)
                .setFooter({ text: `Valorant Store`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp()
        ];

        const usedEditions = new Set();

        for (const Skin of StoreSkins) {
            const tierName = Skin.tier.emoji.match(/:(.*?):/)[1];
            const embed = new EmbedBuilder()
                .setColor(Skin.tier.color)
                .setTitle(`${Skin.tier.emoji} - ${Skin.name}`)
                .setDescription(`Price: **${Skin.price}**`)
                .setImage(Skin.icon);

            if (tierName) {
                usedEditions.add(tierName);
                embed.setThumbnail(images.getEditionURL(tierName));
            }

            Embeds.push(embed);
        }

        await interaction.reply({ 
            embeds: Embeds,
            files: Array.from(usedEditions).map(edition => 
                images.getAttachment(edition.toLowerCase().replace('_edition', ''))
            )
        });
    }
};