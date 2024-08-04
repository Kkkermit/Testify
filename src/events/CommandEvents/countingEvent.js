const { EmbedBuilder, Events } = require('discord.js');
const countingSchema = require('../../schemas/countingSystem');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        const countingData = await countingSchema.findOne({ Guild: message.guild.id });
        if (!countingData) return;

        if (message.channel.id !== countingData.Channel) return;

        const number = parseInt(message.content);

        if (isNaN(number) || number.toString() !== message.content) return;

        if (countingData.Count === 0) {
            if (number !== 1) {

                const errorEmbed = new EmbedBuilder()
                .setAuthor({ name: `${client.user.username}'s counting system` })
                .setTitle('Incorrect Number Provided')
                .setDescription('> You must type 1 before continuing onto other numbers.')
                .setTimestamp()
                .setFooter({ text: `Incorrect Number At` })
                .setColor('Red');

                await message.channel.send({ embeds: [errorEmbed] });
                return;
            }
        }

        if (number === countingData.Count + 1) {
            countingData.Count++;
            await countingData.save();

            const response = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username}'s counting system` })
            .setTitle(`> **${message.author.username}** has successfully counted to \`${countingData.Count}\`.`)
            .setColor('Green')
            .setTimestamp();

            const reaction = await message.channel.send({ embeds: [response] });
            await reaction.react(client.config.countSuccessEmoji);

            if (countingData.Count === countingData.MaxCount) {
                const congratulationsEmbed = new EmbedBuilder()
                .setAuthor({ name: `${client.user.username}'s counting system` })
                .setTitle('Congratulations!')
                .setDescription(`> **${message.author.username}**, you have reached the goal of \`${countingData.MaxCount}\`! Well done!`)
                .setTimestamp()
                .setFooter({ text: `Game Complete` })
                .setColor('Gold');

                const congratsReact = await message.channel.send({ embeds: [congratulationsEmbed] });
                congratsReact.react('🏆')


                countingData.Count = 0;
                await countingData.save();
            }
        } else {
            const wrongNumberEmbed = new EmbedBuilder()
            .setAuthor({ name: `${client.user.username}'s counting system` })
            .setTitle('Wrong Number')
            .setDescription(`> **${message.author.username}** has ruined the fun at number \`${countingData.Count}\`.`)
            .setColor('Red')
            .setTimestamp()
            .setFooter({ text: `Wrong Number Provided` })

            await message.channel.send({ embeds: [wrongNumberEmbed] });

            countingData.Count = 0;
            await countingData.save();
        }
    },
};