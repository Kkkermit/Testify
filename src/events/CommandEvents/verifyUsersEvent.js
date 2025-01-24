const { Events, AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createCanvas } = require('canvas');
const capschema = require('../../schemas/verifySystem');
const verifyusers = require('../../schemas/verifyUsersSystem'); 

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.customId === 'verify') {

            if (interaction.guild === null) return;

            const verifydata = await capschema.findOne({ Guild: interaction.guild.id });
            const verifyusersdata = await verifyusers.findOne({ Guild: interaction.guild.id, User: interaction.user.id });

            if (!verifydata) return await interaction.reply({ content: `The **verification system** has been disabled in this server!`, ephemeral: true});

            if (verifydata.Verified.includes(interaction.user.id)) return await interaction.reply({ content: 'You have **already** been verified!', ephemeral: true});
            
            function generateCaptcha(length) {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let captcha = '';
                for (let i = 0; i < length; i++) {
                    captcha += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return captcha;
            }

            async function generateCaptchaImage(text) {
                const canvas = createCanvas(450,150);
                const ctx = canvas.getContext('2d');

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#FF0000'; 
                ctx.font = 'bold 100px Arial'; 
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle';
                ctx.fillText(text, canvas.width / 2, canvas.height / 2); 

                return canvas.toBuffer();
            }

            const captchaText = generateCaptcha(5); 
            generateCaptchaImage(captchaText).then(async (buffer) => {

                const attachment = new AttachmentBuilder(buffer, { name: `captcha.png`});

                const verifyembed = new EmbedBuilder()
                .setColor(client.config.embedVerify)
                .setAuthor({ name: `Verification System ${client.config.devBy}`})
                .setFooter({ text: `Verification Captcha`})
                .setTimestamp()
                .setImage('attachment://captcha.png')
                .setThumbnail(interaction.guild.iconURL())
                .setTitle('> Verification Step: Captcha')
                .setDescription(`**Verify value**: \n> *Please use the button bellow to submit your captcha!*`)
            
                const verifybutton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                    .setLabel('Enter Captcha')
                    .setStyle(ButtonStyle.Success)
                    .setCustomId('captchaenter')
                )

                await interaction.reply({ embeds: [verifyembed], components: [verifybutton], files: [attachment], ephemeral: true });
            
                if (verifyusersdata) {

                    await verifyusers.deleteMany({
                        Guild: interaction.guild.id,
                        User: interaction.user.id
                    })
                    await verifyusers.create ({
                        Guild: interaction.guild.id,
                        User: interaction.user.id,
                        Key: captchaText
                    })
                } else {
                    await verifyusers.create ({
                        Guild: interaction.guild.id,
                        User: interaction.user.id,
                        Key: captchaText
                    })
                }
            })
            .catch(error => {
                client.logs.error('[VERIFY_ERROR] An error occurred while generating the captcha:', error);
            });
        } else if (interaction.customId === 'captchaenter') {
            const vermodal = new ModalBuilder()
                .setTitle(`Verification`)
                .setCustomId('vermodal')

                const answer = new TextInputBuilder()
                .setCustomId('answer')
                .setRequired(true)
                .setLabel('Please submit your Captcha code')
                .setPlaceholder(`Your captcha code input`)
                .setStyle(TextInputStyle.Short)

                const vermodalrow = new ActionRowBuilder().addComponents(answer);
                vermodal.addComponents(vermodalrow);

            await interaction.showModal(vermodal);
        } else if (interaction.customId === 'vermodal') {
            if (!interaction.isModalSubmit()) return;

            const userverdata = await verifyusers.findOne({ Guild: interaction.guild.id, User: interaction.user.id });
            const verificationdata = await capschema.findOne({ Guild: interaction.guild.id });
        
            if (verificationdata.Verified.includes(interaction.user.id)) return await interaction.reply({ content: `You have **already** verified within ${interaction.guild.name}!`, ephemeral: true});
        
            const modalanswer = interaction.fields.getTextInputValue('answer');
            if (modalanswer === userverdata.Key) {
        
                const verrole = interaction.guild.roles.cache.get(verificationdata.Role);
        
                try {
                    await interaction.member.roles.add(verrole);
                } catch (err) {
                    return await interaction.reply({ content: `There was an **issue** giving you the **<@&${verificationdata.Role}>** role, try again later!`, ephemeral: true})
                }

                await capschema.updateOne({ Guild: interaction.guild.id }, { $push: { Verified: interaction.user.id }});
                try {
                    await interaction.reply({ content: 'You have been **verified!**', ephemeral: true});
                } catch (err) {
                    client.logs.error(`[VERIFY_ERROR] Error replying to the user that he has been verified!`);
                    return;
                } 
            } else {
                await interaction.reply({ content: `**Oops!** It looks like you **didn't** enter the valid **captcha code**!`, ephemeral: true})
            }
        }
    }
};