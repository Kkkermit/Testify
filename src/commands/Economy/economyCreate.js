const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ecoS = require('../../schemas/economySystem');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('economy-create')
    .setDescription('Create an economy account.')
    .addSubcommand(command => command.setName('account').setDescription('Create an economy account')),
    async execute(interaction, client) {

        const { options, guild, user } = interaction;

        let data = await ecoS.findOne({ Guild: guild.id, User: user.id});
        const sub = options.getSubcommand();

        const embed = new EmbedBuilder()

        switch (sub) {
            case "account":
                if (data) {
                    return await interaction.reply({ content: "You already have an economy account!", ephemeral: true })
                } else {
                    await ecoS.create({
                        Guild: guild.id,
                        User: user.id,
                        Bank: 5000,
                        Wallet: 5000,
                        Worked: 0,
                        Gambled: 0,
                        Begged: 0,
                        HoursWorked: 0,
                        CommandsRan: 0,
                        Moderated: 0
                    });

                    embed
                    .setAuthor({ name: `Economy System ${client.config.devBy}` })
                    .setColor(client.config.embedEconomy)
                    .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                    .setThumbnail(client.user.displayAvatarURL())
                    .setDescription('You have created an economy account, you have been awarded:\n\n• $5000 -> 🏦\n• $5000 -> 💵\n\n__Run \`/account view\` to view your balance and information.__')
                    .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
                    .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                }
                break;
        }
    }
}