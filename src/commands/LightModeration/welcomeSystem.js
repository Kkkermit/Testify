const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const WelcomeMessage = require("../../schemas/welcomeSystem");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("welcome-system")
    .setDescription("Configure the welcome message system")
    .addSubcommand(subcommand => subcommand.setName("set").setDescription("Set the welcome message system to the server").addStringOption(option => option.setName("message").setDescription("The welcome message to send. ` Use {user} to mention the user `").setRequired(true)).addChannelOption(option => option.setName("channel").setDescription("The channel to send welcome messages to").setRequired(true)).addBooleanOption(option => option.setName("embed").setDescription("Send the welcome message as an embed").setRequired(true)))
    .addSubcommand(subcommand => subcommand.setName("remove").setDescription("Remove the welcome message system from the server"))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async execute(interaction, client) {

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const isEmbed = interaction.options.getBoolean("embed");
        
        let welcomeMessage = await WelcomeMessage.findOne({ guildId });
        
        if (!welcomeMessage) {
            welcomeMessage = new WelcomeMessage({ guildId });
        }
        
        if (subcommand === "set") {
        
            const channelId = interaction.options.getChannel("channel").id;
            const message = interaction.options.getString("message");

            welcomeMessage.channelId = channelId;
            welcomeMessage.message = message;
            welcomeMessage.isEmbed = isEmbed;
            await welcomeMessage.save();
    
            const successEmbed = new EmbedBuilder()
            .setAuthor({ name: `Welcome System Command ${client.config.devBy}`})
            .setTitle(`${client.user.username} Welcome System Tool ${client.config.arrowEmoji}`)
            .setColor(client.config.embedModLight)
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(`> Welcome message set to: **${message}**.\n\nChannel: <#${channelId}>\nEmbed: **${ isEmbed ? "Yes" : "No" }**`)
            .setFooter({ text: `Welcome system has been setup!`})
            .setTimestamp();
    
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } else if (subcommand === "remove") {
            
            let existingData = await WelcomeMessage.findOne({ guildId });
    
            if (!existingData) {
                return await interaction.reply({ content: "Welcome system **has not** yet been set up in this guild. To set up, use \`\`/welcome-message\`\` set.", ephemeral: true });
            }

            const removedEmbed = new EmbedBuilder()
            .setAuthor({ name: `Welcome System Command ${client.config.devBy}`})
            .setTitle(`${client.user.username} Welcome System Tool ${client.config.arrowEmoji}`)
            .setColor(client.config.embedModLight)
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription("> Welcome message has been **removed** from this server")
            .setFooter({ text: `Welcome system has been removed!`})
            .setTimestamp();
    
            if (existingData) {
                await WelcomeMessage.deleteOne({ guildId });
                await interaction.reply({ embeds: [removedEmbed], ephemeral: true });
            }
        }
    },
};