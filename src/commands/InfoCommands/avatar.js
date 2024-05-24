const { EmbedBuilder, SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require(`discord.js`);

module.exports = {
    data: new SlashCommandBuilder()
    .setName(`avatar`)
    .setDescription(`Get anybody's Profile Picture / Banner.`)
    .addUserOption(option => option.setName(`user`).setDescription(`Select a user`).setRequired(false)),
    async execute (interaction, client) {

        const userMention = interaction.options.getUser(`user`) || interaction.user;

        let banner = await (await interaction.client.users.fetch(userMention.id, { force: true })).bannerURL({ dynamic: true, size: 4096 });

        const cmp = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setLabel(`Avatar`)
            .setCustomId(`avatar`)
            .setDisabled(true)
            .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
            .setLabel(`Banner`)
            .setCustomId(`banner`)
            .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
            .setLabel(`Delete`)
            .setCustomId(`delete`)
            .setStyle(ButtonStyle.Danger)
        )

        const cmp2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
            .setLabel(`Avatar`)
            .setCustomId(`avatar`)
            .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
            .setLabel(`Banner`)
            .setCustomId(`banner`)
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
            .setLabel(`Delete`)
            .setCustomId(`delete`)
            .setStyle(ButtonStyle.Danger)
        )

        const embed = new EmbedBuilder()
        .setColor(client.config.embedInfo)
        .setAuthor({ name: `${userMention.tag}`, iconURL: `${userMention.displayAvatarURL({ dynamic: true, size: 512 })}`})
        .setTitle(`Download`)
        .setFooter({ text: `Avatar command ${client.config.devBy}`})
        .setURL(userMention.displayAvatarURL({ size: 1024, format: `png`, dynamic: true}))
        .setImage(userMention.displayAvatarURL({ size: 1024, format: "png", dynamic: true }))

        const embed2 = new EmbedBuilder()
        .setColor(client.config.embedInfo)
        .setAuthor({ name: `${userMention.tag}`, iconURL: `${userMention.displayAvatarURL({ dynamic: true, size: 512 })}`})
        .setDescription(banner ? " " : "User does not have a banner")
        .setFooter({ text: `Avatar command ${client.config.devBy}`})
        .setTitle(`Download`)
        .setURL(banner)
        .setImage(banner)

        const message = await interaction.reply({ embeds: [embed], components: [cmp] });
        const collector = await message.createMessageComponentCollector();

        collector.on(`collect`, async c => {

          const response = `Only ${interaction.user.tag} can interact with the buttons!`
      
            if (c.customId === 'avatar') {
              if (c.user.id !== interaction.user.id) {
                return await c.reply({ content: `${response}`, ephemeral: true})
              }
              await c.update({ embeds: [embed], components: [cmp]})
            }

            if (c.customId === 'banner') {
              if (c.user.id !== interaction.user.id) {
                return await c.reply({ content: `${response}`, ephemeral: true})
              }
              await c.update({ embeds: [embed2], components: [cmp2]})
            }

            if (c.customId === 'delete') {
              if (c.user.id !== interaction.user.id) {
                return await c.reply({ content: `${response}`, ephemeral: true})
              }
              interaction.deleteReply();
            }
          })
    }
}