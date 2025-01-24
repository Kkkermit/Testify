const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const fs = require('fs');
const path = require('path');

const schemaNames = fs.readdirSync(path.join(__dirname, '../../schemas'))
    .filter(file => file.endsWith('.js'))
    .map(file => file.slice(0, -3)); 

const choices = schemaNames.map(name => ({ name, value: name }));

const commandData = new SlashCommandBuilder()
    .setName('wipe-user-data')
    .setDescription('Clears a user\'s data from a specified schema.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName('user').setDescription('The user to clear the data for.').setRequired(true))
    .addStringOption(option => option.setName('schema').setDescription('The schema to clear the data from.').setRequired(true).addChoices(...choices))
    
module.exports = {
    data: commandData,
    async execute(interaction, client) {
        const user = interaction.options.getUser("user");
        const guild = interaction.guild.id;
        const schemaName = interaction.options.getString("schema");

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});
    
        try {
            const schema = require(`../../schemas/${schemaName}`);
            const deletedData = await schema.findOneAndDelete({
                Guild: guild,
                UserId: user.id,
            });
    
            if (deletedData) {

                const schemaEmbed = new EmbedBuilder()
                .setColor(client.config.embedModHard)
                .setAuthor({ name: `Schema Wipe ${client.config.devBy}`})
                .setTitle(`${client.user.username} Schema Wipe ${client.config.arrowEmoji}`)
                .setDescription(`> Successfully wiped data for user **${user.tag}** from the \`${schemaName}\` schema.`)
                .setFooter({ text: `Schema Wipe`})
                .setThumbnail(client.user.avatarURL())
                .setTimestamp();

                interaction.reply({ embeds: [schemaEmbed], ephemeral: true });
            } else {
                interaction.reply({ content: `No data found for user ${user.tag} in the ${schemaName} schema.`, ephemeral: true });
            }
        } catch (error) {
            client.logs.error("[SCHEMAS_WIPE] Error wiping user data:", error);
            interaction.reply({ content: "An error occurred while wiping user data. Please try again. If the error persists please submit a bug report by using the command \`\`/bug-report\`\`", ephemeral: true });
        }
    },
};