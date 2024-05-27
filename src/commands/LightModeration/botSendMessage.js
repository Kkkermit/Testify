const {SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a message through the bot")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(options => options.setName("channel").setDescription("The channel you want to send the message").setRequired(false)),
    async execute(interaction, client) {

        let channel = interaction.options.getChannel("channel");

        if (!channel) { channel = interaction.channel }

        let sayModal = new ModalBuilder()
        .setCustomId("say")
        .setTitle("Say something through the bot")
            
        let sayquestion = new TextInputBuilder()
        .setCustomId("say")
        .setLabel("Say something")
        .setPlaceholder("Type something...")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
            
        let sayEmbed = new TextInputBuilder()
        .setCustomId('embed')
        .setLabel("Embed mode on/off?")
        .setPlaceholder("on/off")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
            
        let say = new ActionRowBuilder().addComponents(sayquestion);
        let sayEmb = new ActionRowBuilder().addComponents(sayEmbed);

        sayModal.addComponents(say, sayEmb)

        await interaction.showModal(sayModal)
            
        try {
            let response = await interaction.awaitModalSubmit({ time: 300000 })
            let message = response.fields.getTextInputValue('say')
            let embedSay = response.fields.getTextInputValue('embed')

            const embed = new EmbedBuilder()
            .setDescription(message)
            .setColor(client.config.embedModLight)
                
            if (embedSay === "on" || embedSay === "On") {
                await channel.send({embeds: [embed]})
            } else {
                await channel.send(message)
            }

            await response.reply({content: `Your message has been sent in <#${interaction.channel.id}>`, ephemeral: true})
        } catch (error) {
            console.error(error)
            return;
        }
    },
};