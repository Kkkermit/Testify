const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js'); 
const ecoSchema = require('../../schemas/economySystem');

var timeout = [];

module.exports = {
    usableInDms: false,
    category: 'Economy',
    data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob a person money')
    .addUserOption(option => option.setName('user') .setDescription('Pick the user who you want to rob') .setRequired(true)),
    async execute (interaction, client) {

        const { options, user, guild } = interaction
        if (timeout.includes(interaction.user.id)) return await interaction.reply({ content: 'You need to wait **1min** to rob another user again', flags: MessageFlags.Ephemeral });

        const userStealing = options.getUser('user');

        let Data = await ecoSchema.findOne({ Guild: guild.id, User: user.id });
        let DataUser = await ecoSchema.findOne({ Guild: guild.id, User: userStealing.id });

        if (!Data) return await interaction.reply({ content: "You don't have an account, create one using \`/economy-create account\`", flags: MessageFlags.Ephemeral });
        if (userStealing == interaction.user) return await interaction.reply({ content: 'You **cannot** rob yourself!', flags: MessageFlags.Ephemeral });
        if (!DataUser) return await interaction.reply({ content: 'That user **does not** have an economy account created', flags: MessageFlags.Ephemeral });
        if (DataUser.Wallet <= 0) return await interaction.reply({ content: 'That user **does not** have any money in their wallet', flags: MessageFlags.Ephemeral });

        let negative = Math.round((Math.random() * -150) - 10);
        let positive = Math.round((Math.random() * 300) - 10);

        const posN = [negative, positive];

        const amount = Math.round(Math.random() * posN.length);
        const value = posN[amount];

        if (Data.Wallet <= 0) return await interaction.reply({ content: 'You **cannot** rob this person because your wallet has **$0** in it', flags: MessageFlags.Ephemeral });

        if (value > 0) {
            const positiveChoices = [
                "You stole",
                "The owner saw you and helped you rob",
                "You robbed",
                "You took",
                "You successfully robbed",
                "You Beat the person and took",
                "You robbed the person and ran away with",
                "You hacked into the person's bank account and took",
            ]

            const posName = Math.floor(Math.random() * positiveChoices.length);

            const begEmbed = new EmbedBuilder()
            .setColor(client.config.embedEconomy)
            .setAuthor({ name: `Economy System ${client.config.devBy}`})
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .addFields({ name: '> You robbed and', value: `• ${positiveChoices[[posName]]} $${value}`})
            .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
            .setThumbnail(client.user.avatarURL())
            .setTimestamp()

            await interaction.reply({ embeds: [begEmbed] })

            Data.Wallet += value;
            await Data.save();

            DataUser.Wallet -= value;
            await DataUser.save()
        } else if (value < 0) {
            const negativeChoices = [
                "You got caught by the cops and lost",
                "You left your ID and got arrested, you lost",
                "The person knocked you out and took",
                "The person saw you and took",
                "The person caught you and took",
                "The person beat you up and took",
                "The person called the cops and you lost",
            ]

            const wal = Data.Wallet;
            if (isNaN(value)) return await interaction.reply({ content: 'This user called the cops on you, but you ran away. You didn\'t lose or gain anything', flags: MessageFlags.Ephemeral });

            const negName = Math.floor(Math.random() * negativeChoices.length);

            let nonSymbol;
            if (value - wal < 0) {
                const stringV = `${value}`;

                nonSymbol = await stringV.slice(1);

                const los = new EmbedBuilder()
                .setColor(client.config.embedEconomy)
                .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
                .setAuthor({ name: `Economy System ${client.config.devBy}`})
                .addFields({ name: '> You robbed and', value: `• ${negativeChoices[[negName]]} $${nonSymbol}`})
                .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
                .setThumbnail(client.user.avatarURL())
                .setTimestamp()

                Data.Bank += value;
                await Data.save();

                DataUser.Wallet -= value;
                await DataUser.save();

                return interaction.reply({ embeds: [los] })

            }

            const begLostEmbed = new EmbedBuilder()
            .setColor(client.config.embedEconomy)
            .setTitle(`${client.user.username} Economy System ${client.config.arrowEmoji}`)
            .setAuthor({ name: `Economy System ${client.config.devBy}`})
            .addFields({ name: '> You robbed and', value: `• ${negativeChoices[[negName]]} $${value}`})
            .setFooter({ text: `${guild.name}'s Economy`, iconURL: guild.iconURL() })
            .setThumbnail(client.user.avatarURL())
            .setTimestamp()

            await interaction.reply({ embeds: [begLostEmbed] })

            Data.Wallet += value;
            await Data.save();

            DataUser.Wallet -= value;
            await DataUser.save()
        }

        timeout.push(interaction.user.id);
        setTimeout(() => {
            timeout.shift()
        }, 30000)
    }
}