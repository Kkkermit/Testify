const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const ValoAPI = require('../../api/valorantApi');
const ValorantUser = require('../../schemas/valorantUserSystem');
const images = require('../../images');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('valorant')
        .setDescription('valorant commands')
        .addSubcommand(command => command.setName('login').setDescription('Connect your Valorant account'))
        .addSubcommand(command => command.setName('search-skin').setDescription('search a skin by its name').addStringOption(option => option.setName('name').setDescription('Name of the skin to search!').setRequired(true).setAutocomplete(true)))
        .addSubcommand(command => command.setName('store').setDescription('View your Valorant store')),

    async autocomplete(interaction, client) {
        const focused = interaction.options.getFocused(true);
        
        if (focused.name === 'name') {
            let skins = [];
            if (focused.value) {
                skins = client.skins.filter(s => 
                    s["displayName"]["de-DE"].toLowerCase().includes(focused.value.toLowerCase()) || 
                    s["displayName"]["en-US"].toLowerCase().includes(focused.value.toLowerCase())
                );
            }
            await interaction.respond(
                skins.slice(0, 25).map(d => ({ 
                    name: d["displayName"]["en-US"], 
                    value: d["uuid"] 
                }))
            );
        }
    },
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        switch (sub) {

            case 'login':

                const Embed = new EmbedBuilder()
                    .setAuthor({ name: `Valorant Login | Developed by arnsfh`, iconURL: "https://i.postimg.cc/RVzrNstM/arnsfh.webp" })
                    .setFooter({ text: `Valorant Login`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp()
                    .setTitle(`${client.user.username} Valorant Login ${client.config.arrowEmoji}`)
                    .setDescription('**__Login to valorant account__** \n\nLogin your Riot Games account for **1** hour!\n`1.` Click on "Get URL"\n`2.` On the 404 Page copy the **full** URL\n`3.` Click the "Login button" and paste the copied URL')
                    .setColor(client.config.embedColor);

                const Buttons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('login-button')
                            .setLabel('Login')
                            .setStyle(ButtonStyle.Primary),

                        new ButtonBuilder()
                            .setLabel('Get URL')
                            .setURL('https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid')
                            .setStyle(ButtonStyle.Link)
                    );

                    const response = await interaction.reply({ content: '[Copy link](https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid)', 
                        embeds: [Embed], 
                        components: [Buttons], 
                        ephemeral: true 
                    });
            
                    const collector = response.createMessageComponentCollector({ 
                        filter: i => i.customId === 'login-button' && i.user.id === interaction.user.id,
                        time: 60000 
                    });
            
                    collector.on('collect', async i => {
                        const Modal = new ModalBuilder()
                            .setCustomId('riot-login')
                            .setTitle('Riot Login')
                            .addComponents(
                                new ActionRowBuilder()
                                    .addComponents(
                                        new TextInputBuilder()
                                            .setCustomId('accessTokenURL')
                                            .setLabel('URL')
                                            .setStyle(TextInputStyle.Short)
                                            .setPlaceholder('Enter url')
                                    )
                            );
            
                        await i.showModal(Modal);

                        const modalSubmit = await i.awaitModalSubmit({
                            filter: i => i.customId === 'riot-login',
                            time: 60000
                        }).catch(() => null);
            
                        if (modalSubmit) {
                            const aTURL = modalSubmit.fields.getTextInputValue('accessTokenURL');
            
                            const valApi = new ValoAPI({ 
                                accessTokenURL: aTURL, 
                                SkinsData: client.skins, 
                                SkinsTier: client.skinsTier 
                            });
            
                            await valApi.initialize();
            
                            const { access_token, entitlement_token, user_uuid } = valApi.getTokens();
                            const ExpireDate = Math.floor(Date.now() + 59 * 60 * 1000);
            
                            await ValorantUser.findOneAndUpdate(
                                { userId: modalSubmit.user.id },
                                {
                                    userId: modalSubmit.user.id,
                                    accessToken: access_token,
                                    entitlementToken: entitlement_token,
                                    userUUID: user_uuid,
                                    expires: new Date(ExpireDate)
                                },
                                { upsert: true }
                            );

                            await modalSubmit.reply({ content: `Successfully logged in! Expires (<t:${Math.floor(ExpireDate / 1000)}:R>)`, ephemeral: true });
                        }
                    });

                break;
                case 'search-skin':

                    const skinUUID = interaction.options.getString('name');
                    const foundSkin = client.skins.find(s => s["uuid"] === skinUUID);
    
                    if (!foundSkin) {
                        return interaction.reply({ 
                            content: 'Skin not found!', 
                            ephemeral: true 
                        });
                    }
    
                    const skinTier = client.skinsTier.find(s => s["uuid"] === foundSkin["contentTierUuid"]) || {
                        highlightColor: "808080FF",
                        displayIcon: null,
                        price: 0
                    };

                    const skinPrice = await fetch("https://val-skin-price.vercel.app/beta/skins/" + skinUUID);
                    const skinPriceData = await skinPrice.json();
    
                    const skinEmbed = new EmbedBuilder()
                        .setAuthor({ name: `Valorant Skin Search | Developed by arnsfh`, iconURL: "https://i.postimg.cc/RVzrNstM/arnsfh.webp" })
                        .setTitle(`${client.user.username} Valorant Skin Search ${client.config.arrowEmoji}`)
                        .setColor(`#${skinTier["highlightColor"].slice(0, -2)}` || "DarkerGrey")
                        .setThumbnail(skinTier["displayIcon"])
                        .setImage(foundSkin["levels"][0]["displayIcon"] || foundSkin["displayIcon"])
                        .setFooter({ text: `Valorant Skin Search`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp()
                        .setDescription(`> **${foundSkin["displayName"]["en-US"]}** \n\nPrice: **${skinPriceData["price"]}** ${client.config.valoPoints}`);
    
                    await interaction.reply({ embeds: [skinEmbed] });

                break;
                case 'store':

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

                break;
            }
        }
    }
