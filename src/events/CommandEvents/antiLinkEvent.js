const { Events, EmbedBuilder } = require('discord.js');
const linkSchema = require('../../schemas/antiLinkSystem');
const warningSchema = require('../../schemas/warningSystem');

module.exports = {
    name: Events.MessageCreate,
    async execute (message, client) {

        if (!message.guild || message.author.bot) return;
        
        if (message.content.startsWith('http') || message.content.startsWith('discord.gg') || message.content.includes('https://') || message.content.includes('http://') || message.content.includes('discord.gg/') || message.content.includes('www.') || message.content.includes('.net') || message.content.includes('.com')) {

            const Data = await linkSchema.findOne({ Guild: message.guild.id });

            if (!Data) return;

            const memberPerms = Data.Perms;

            const user = message.author;
            const member = message.guild.members.cache.get(user.id);

            const embed = new EmbedBuilder()
            .setColor(client.config.embedModHard)
            .setAuthor({ name: `Anti-link system ${client.config.devBy}`})
            .setTitle(`${client.config.modEmojiHard} ${client.user.username} Anti-link system ${client.config.arrowEmoji}`)
            .setDescription(`> Link detected and deleted successfully! \n> ${message.author}, links are **disabled** in **${message.guild.name}**. Please **do not** send links in this server!`)
            .setFooter({ text: 'Anti-link detected a link'})
            .setThumbnail(client.user.avatarURL())
            .setTimestamp()

            if (member.permissions.has(memberPerms)) return;
            else {
                await message.channel.send({ embeds: [embed] }).then (msg => {
                    setTimeout(() => msg.delete(), 5000)
                })

                ;(await message).delete();

                warningSchema.findOne({ GuildID: message.guild.id, UserID: message.author.id, UserTag: message.author.tag }, async (err, data) => {

                    if (err) throw err;
        
                    if (!data) {
                        data = new warningSchema({
                            GuildID: message.guild.id,
                            UserID: message.author.id,
                            UserTag: message.author.tag,
                            Content: [
                                {
                                    ExecuterId: '1211784897627168778',
                                    ExecuterTag: 'Testify#0377',
                                    Reason: 'Use of forbidden links'
                                }
                            ],
                        });
                    } else {
                        const warnContent = {
                            ExecuterId: '1211784897627168778',
                            ExecuterTag: 'Testify#0377',
                            Reason: 'Use of forbidden links'
                        }
                        data.Content.push(warnContent);
                    }
                    data.save()
                })
            }
        }
    }
}