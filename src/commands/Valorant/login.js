const { SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, ButtonStyle, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const ValoAPI = require('../../api/valorantApi');
const ValorantUser = require('../../schemas/valorantUserSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('login')
        .setDescription('login for 1 hour!'),
    async execute(interaction, client) {

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

            const response = await interaction.reply({ embeds: [Embed], 
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
        }
    }