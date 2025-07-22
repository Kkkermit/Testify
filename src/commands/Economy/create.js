const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const economySchema = require('../../schemas/economySchema');

module.exports = {
    usableInDms: false,
    category: "Economy",
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy system commands')
        .addSubcommand(subcommand => 
            subcommand.setName('create')
            .setDescription('Create your economy account'))
        .addSubcommand(subcommand => 
            subcommand.setName('delete')
            .setDescription('Delete your economy account')),
            
    async execute(interaction, client) {
        const { guild, user, options } = interaction;
        const subcommand = options.getSubcommand();
        
        let data = await economySchema.findOne({ Guild: guild.id, User: user.id });
        
        if (subcommand === 'create') {
            if (data) {
                return interaction.reply({
                    content: "You already have an economy account!",
                    ephemeral: true
                });
            }
            
            data = new economySchema({
                Guild: guild.id,
                User: user.id,
                Bank: 0,
                Wallet: 1000,
                Worked: 0,
                Gambled: 0,
                Begged: 0,
                HoursWorked: 0,
                CommandsRan: 0,
                Moderated: 0
            });
            
            await data.save();
            
            const embed = new EmbedBuilder()
                .setColor(client.config.embedEconomyColor || '#00FF00')
                .setTitle('💰 Account Created')
                .setDescription(`Welcome to the economy system! You have been given **$1,000** to start with.\n\nUse \`/balance\` to check your balance and \`/help\` to see all available commands.`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        } else if (subcommand === 'delete') {
            if (!data) {
                return interaction.reply({
                    content: "You don't have an economy account to delete!",
                    ephemeral: true
                });
            }
            
            await economySchema.findOneAndDelete({ Guild: guild.id, User: user.id });
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Account Deleted')
                .setDescription(`Your economy account has been deleted. All your data has been erased.\n\nYou can create a new account using \`/economy create\`.`)
                .setFooter({ text: `${guild.name} Economy`, iconURL: guild.iconURL() })
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed] });
        }
    }
};
