const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js")
const blacklistSchema = require("../../schemas/blacklistSystem")

module.exports = {
    data: new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("Blacklist system for users (OWNER ONLY COMMAND)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName('add').setDescription('Add a user to the blacklist').addStringOption(option => option.setName("userid").setDescription("The user to add to the blacklist (MUST BE THEIR ID)").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("The reason for the blacklist").setRequired(false)))
    .addSubcommand(command => command.setName('remove').setDescription('Remove a user from the blacklist').addStringOption(option => option.setName("user").setDescription("The user to remove from the blacklist (MUST BE THEIR ID)").setRequired(true))),
    async execute(interaction, client) {

        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case "add":

            if (interaction.user.id !== client.config.developers) {
                return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, ephemeral: true,});
            }

            const addBlacklistUser = interaction.options.getString("userid")
            const reasonOption = interaction.options.getString("reason") || "No reason provided";
            const errorArray = [];

            const blacklist = await blacklistSchema.findOne({ userId: addBlacklistUser });

            const embed = new EmbedBuilder()
            .setAuthor({ name: `Blacklist Command ${client.config.devBy}` })
            .setTitle(`${client.user.username} Blacklist Tool ${client.config.arrowEmoji}`)
            .setThumbnail(client.user.displayAvatarURL())
            .setColor(client.config.embedDev)
            .setDescription(`__Successfully added user to blacklist with the reason__: \n**${reasonOption}**`)
            .setFooter({ text: `User Blacklisted from ${client.user.username}` })
            .setTimestamp();

            if (blacklist) {
                errorArray.push(`${addBlacklistUser} has already been blacklisted from ${client.user.username}`);
                }
                if (errorArray.length) {
                const errorEmbed = new EmbedBuilder()
                .setDescription(`There was an error when adding user to blacklist.\nError(s):\n ${errorArray.join(`\n`)}`)
                .setColor(client.config.embedDev);

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            } else {
                await blacklistSchema.create({ userId: addBlacklistUser, reason: reasonOption });

                await interaction.reply({ embeds: [embed] });
            }

            break;
            case "remove":

            if (interaction.user.id !== client.config.developers) {
                return await interaction.reply({ content: `${client.config.ownerOnlyCommand}`, ephemeral: true,});
            }

            const removeBlacklistUser = interaction.options.getString("user")

            const userToRemove = await blacklistSchema.findOne({ userId: removeBlacklistUser });

            if (!userToRemove) {
                return await interaction.reply({ content: `User ${removeBlacklistUser} has not been blacklisted from using ${client.user.username}`, ephemeral: true });
            }

            const removeEmbed = new EmbedBuilder()
            .setAuthor({ name: `Blacklist Command ${client.config.devBy}` })
            .setTitle(`${client.user.username} Blacklist Tool ${client.config.arrowEmoji}`)
            .setDescription(`__Successfully removed user (${removeBlacklistUser}) from blacklist__`)
            .setColor(client.config.embedDev)
            .setFooter({ text: `User removed from blacklist` })
            .setTimestamp()
            .setThumbnail(interaction.client.user.displayAvatarURL());

            try {
                await blacklistSchema.findOneAndDelete({ userId: removeBlacklistUser })
                interaction.reply({ embeds: [removeEmbed] })
            } catch (err) {
                client.logs.error(`[BLACKLIST_SYSTEM] There was an error removing the blacklist from ${removeBlacklistUser}`, err)
            }
        }
    }
}