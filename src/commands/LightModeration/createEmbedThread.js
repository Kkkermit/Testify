const { SlashCommandBuilder, EmbedBuilder, GuildTextThreadManager, PermissionsBitField, PermissionFlagsBits } = require('discord.js')
var timeout = [];

module.exports = {
    data: new SlashCommandBuilder()
    .setName('create')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDescription('Creates threads & embeds for you.')
    .addSubcommand(command => command.setName('embed').setDescription('Creates an embed with specified values for you.')
    .addStringOption(option => option.setName('title').setDescription(`Embed's preferred title.`).setRequired(true).setMaxLength(200))
    .addStringOption(option => option.setName('description').setDescription(`Embed's preferred description.`).setRequired(true).setMaxLength(2048))
    .addStringOption(option => option.setName("color").setDescription("Specified color will be used for the embed.").setRequired(true)
        .addChoices(
            {name: "• Aqua", value: "#00FFFF"},
            {name: "• Blurple", value: "#7289DA"},
            {name: "• Fuchsia", value: "#FF00FF"},
            {name: "• Gold", value: "#FFD700"},
            {name: "• Green", value: "#008000"},
            {name: "• Grey", value: "#808080"},
            {name: "• Greyple", value: "#7D7F9A"},
            {name: "• Light-grey", value: "#D3D3D3"},
            {name: "• Luminous-vivid-pink", value: "#FF007F"},
            {name: "• Navy", value: "#000080"},
            {name: "• Not-quite-black", value: "#232323"},
            {name: "• Orange", value: "#FFA500"},
            {name: "• Purple", value: "#800080"},
            {name: "• Red", value: "#FF0000"},
            {name: "• White", value: "#FFFFFF"},
            {name: "• Yellow", value: "#FFFF00"},
            {name: "• Blue", value: "#0000FF"}
        )
    )
    .addStringOption(option => option.setName('image').setDescription(`Embed's preferred image. Use a URL.`).setRequired(false))
    .addStringOption(option => option.setName('thumbnail').setDescription(`Embed's preferred thumbnail. Use a URL.`).setRequired(false))
    .addStringOption(option => option.setName('field-name').setDescription(`Embed's preferred field-name.`).setRequired(false).setMaxLength(256))
    .addStringOption(option => option.setName('field-value').setDescription(`Embed's preferred field-value.`).setRequired(false).setMaxLength(1024))
    .addStringOption(option => option.setName('second-field-name').setDescription(`Embed's preferred field-name.`).setRequired(false).setMaxLength(256))
    .addStringOption(option => option.setName('second-field-value').setDescription(`Embed's preferred field-value.`).setRequired(false).setMaxLength(1024))
    .addStringOption(option => option.setName('third-field-name').setDescription(`Embed's preferred field-name.`).setRequired(false).setMaxLength(256))
    .addStringOption(option => option.setName('third-field-value').setDescription(`Embed's preferred field-value.`).setRequired(false).setMaxLength(1024))
    .addStringOption(option => option.setName('forth-field-name').setDescription(`Embed's preferred field-name.`).setRequired(false).setMaxLength(256))
    .addStringOption(option => option.setName('forth-field-value').setDescription(`Embed's preferred field-value.`).setRequired(false).setMaxLength(1024))
    .addStringOption(option => option.setName('fifth-field-name').setDescription(`Embed's preferred field-name.`).setRequired(false).setMaxLength(256))
    .addStringOption(option => option.setName('fifth-field-value').setDescription(`Embed's preferred field-value.`).setRequired(false).setMaxLength(1024))
    .addStringOption(option => option.setName('sixth-field-name').setDescription(`Embed's preferred field-name.`).setRequired(false).setMaxLength(256))
    .addStringOption(option => option.setName('sixth-field-value').setDescription(`Embed's preferred field-value.`).setRequired(false).setMaxLength(1024))
    .addStringOption(option => option.setName('footer').setDescription(`Embed's preferred footer.`).setRequired(false)))
    
    .addSubcommand(command => command.setName('thread').setDescription('Creates a temporary thread for you.')
    .addStringOption(option => option.setName('name').setDescription("Specified name will be used for your thread.").setRequired(false))),
    async execute(interaction) {

        const sub = interaction.options.getSubcommand();

        switch (sub) {

            case 'embed':

            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color');
            const image = interaction.options.getString('image') || 'null';
            const thumbnail = interaction.options.getString('thumbnail') || 'null';
            const fieldn = interaction.options.getString('field-name');
            const fieldv = interaction.options.getString('field-value') || ' ';
            const footer = interaction.options.getString('footer') || ' ';
            const fieldn2 = interaction.options.getString('second-field-name');
            const fieldv2 = interaction.options.getString('second-field-value') || ' ';
            const fieldn3 = interaction.options.getString('third-field-name');
            const fieldv3 = interaction.options.getString('third-field-value') || ' ';
            const fieldn4 = interaction.options.getString('forth-field-name');
            const fieldv4 = interaction.options.getString('forth-field-value') || ' ';
            const fieldn5 = interaction.options.getString('fifth-field-name');
            const fieldv5 = interaction.options.getString('fifth-field-value') || ' ';
            const fieldv6 = interaction.options.getString('sixth-field-value') || ' ';
            const fieldn6 = interaction.options.getString('sixth-field-name');

            if (image) {
                if (!image.startsWith('http') && image !== 'null') return await interaction.reply({ content: 'You **cannot** make this your image!', ephemeral: true})
            }

            if (thumbnail) {
                if (!thumbnail.startsWith('http') && thumbnail !== 'null') return await interaction.reply({ content: 'You **cannot** make this your thumbnail!', ephemeral: true})
            }
        
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});

            const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: `${footer}`, iconURL: interaction.member.displayAvatarURL({ dynamic: true})})
            .setColor(`${color}`)
            .setTimestamp()

            if (image !== 'null') {
                embed.setImage(image)
            }

            if (thumbnail !== 'null') {
                embed.setThumbnail(thumbnail)
            }

            if (fieldn !== null) {
                embed.addFields({ name: `${fieldn}`, value: `${fieldv}`})
            }
        
            if (fieldn2 !== null) {
                embed.addFields({ name: `${fieldn2}`, value: `${fieldv2}`})
            }

            if(fieldn3 !== null) {
                embed.addFields({ name: `${fieldn3}`, value: `${fieldv3}`})
            }

            if (fieldn4 !== null) {
                embed.addFields({ name: `${fieldn4}`, value: `${fieldv4}`})
            }
        
            if (fieldn5 !== null) {
                embed.addFields({ name: `${fieldn5}`, value: `${fieldv5}`})
            }
        
            if (fieldn6 !== null) {
                embed.addFields({ name: `${fieldn6}`, value: `${fieldv6}`})
            }
        
            await interaction.reply({ content: `Your **embed** has been created!`, ephemeral: true})
            await interaction.channel.send({ embeds: [embed]})

            break;
            case 'thread':

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && timeout.includes(interaction.member.id)) return await interaction.reply({ content: 'You are on cooldown! You **cannot** execute /create-thread.', ephemeral: true})
        
            const threadtitle = interaction.options.getString('name') || 'Unnamed Thread';
            await interaction.channel.threads.create({
                name: `${threadtitle}`,
                autoArchiveDuration: 60,
                reason: 'Created a thread by an Admin.'
            });
        
            await interaction.reply({ content: `Created the "**${threadtitle}**" thread!`, ephemeral: true});

            timeout.push(interaction.user.id);
            setTimeout(() => {
                timeout.shift();
            }, 60000)
        }   
    }
}