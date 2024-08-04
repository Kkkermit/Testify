const { Events, EmbedBuilder } = require('discord.js');
const levelSchema = require('../../schemas/userLevelSystem');
const levelschema = require('../../schemas/levelSetupSystem');

module.exports = {
    name: Events.MessageCreate,
    async execute (message, client, err) {

        const { guild, author } = message;
        if (message.guild === null) return;
        const leveldata = await levelschema.findOne({ Guild: message.guild.id });

        if (!leveldata || leveldata.Disabled === 'disabled') return;
        let multiplier = 1;
        
        multiplier = Math.floor(leveldata.Multi);
        

        if (!guild || author.bot) return;

        levelSchema.findOne({ Guild: guild.id, User: author.id}, async (err, data) => {

            if (err) throw err;

            if (!data) {
                levelSchema.create({
                    Guild: guild.id,
                    User: author.id,
                    XP: 0,
                    Level: 0
                })
            }
        })

        const channel = message.channel;
        const give = 1;
        const data = await levelSchema.findOne({ Guild: guild.id, User: author.id});

        if (!data) return;

        const requiredXP = data.Level * data.Level * 20 + 20;

        if (data.XP + give >= requiredXP) {

            data.XP += give;
            data.Level += 1;
            await data.save();
            
            if (!channel) return;

            const levelEmbed = new EmbedBuilder()
            .setColor(client.config.embedLevels)
            .setAuthor({ name: `Leveling System ${client.config.devBy}` })
            .setTitle(`> ${client.user.username} Leveling System ${client.config.arrowEmoji}`)
            .setDescription(`\`\`\`${author.username} has leveled up to level ${data.Level}!\`\`\``)
            .setThumbnail(author.avatarURL({ dynamic: true }))
            .setFooter({ text: `${author.username} Leveled Up`})
            .setTimestamp()

            await message.channel.send({ embeds: [levelEmbed] }).catch(err => client.logs.error('[LEVEL_ERROR] Error sending level up message!'));
        } else {

            if(message.member.roles.cache.find(r => r.id === leveldata.Role)) {
                data.XP += give * multiplier;
            } data.XP += give;
            data.save();
        }
    }
}