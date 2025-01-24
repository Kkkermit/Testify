const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const warningSchema = require("../../schemas/warningSystem");
const config = require('../../config')

module.exports = {
    data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn command")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(command => command.setName("create").setDescription("Create a warn").addUserOption(option => option.setName("user").setDescription("the user you want to warn").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("the reason for the warn").setRequired(true)))
    .addSubcommand(command => command.setName("list").setDescription("Get a list of a users warns").addUserOption(option => option.setName("user").setDescription("the user you want to get the warns").setRequired(false)))
    .addSubcommand(command => command.setName("info").setDescription("Get a info about a warn").addUserOption(option => option.setName("user").setDescription("the user you want to get the warn info").setRequired(true)).addStringOption(option => option.setName("warn-id").setDescription("the warn id").setRequired(true)))
    .addSubcommand(command => command.setName("edit").setDescription("Edit a warn").addUserOption(option => option.setName("user").setDescription("the user you want to get the warn info").setRequired(true)).addStringOption(option => option.setName("warn-id").setDescription("the warn id").setRequired(true)).addStringOption(option => option.setName("reason").setDescription("the reason for the warn").setRequired(true)))
    .addSubcommand(command => command.setName("clear").setDescription("Clear all warns of a user").addUserOption(option => option.setName("user").setDescription("the user you want to get the warn info").setRequired(true)))
    .addSubcommand(command => command.setName("remove").setDescription("Remove a users warn").addUserOption(option => option.setName("user").setDescription("the user you want to get the warn info").setRequired(true)).addStringOption(option => option.setName("warn-id").setDescription("the warn id").setRequired(true))),
    async execute (interaction) {

        const { guild, member, user, options } = interaction;

        if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) { return await interaction.reply({ content: `${config.noPerms}`, ephemeral: true });}

        const subcommand = options.getSubcommand();

        switch (subcommand) {
            case "create":
                const t = options.getUser("user").id;
                const r = options.getString("reason");
                await addWarn(interaction, t, r);
                break;
            case "list":
                const e = options.getUser("user") || user;
                const eid = e.id;
                await listWarns(interaction, eid);
                break;
                case "info":
                    const w = options.getUser("user").id;
                    const wid = options.getString("warn-id");
                    await getWarnInfo(interaction, w, wid);
                    break;
            case "edit":
                const u = options.getUser("user").id;
                const wuid = options.getString("warn-id");
                const newReas = options.getString("reason");
                await editWarn(interaction, u, wuid, newReas);
                break;
            case "clear":
                const tar = options.getUser("user").id;
                await clearWarns(interaction, tar);
                break;
            case "remove":
                const c = options.getUser("user").id;
                const wcid = options.getString("warn-id");
                await removeWarn(interaction, c, wcid);
                break;
            default:
                await interaction.reply({ content: "Invalid subcommand!", ephemeral: true });
        }
    }
}

async function addWarn(interaction, targetUserId, reason) {
    const warningData = await warningSchema.findOneAndUpdate(
        { GuildID: interaction.guild.id, UserID: targetUserId },
        {
            $push: { 
                Content: {
                    ExecuterId: interaction.user.id,
                    ExecuterTag: interaction.user.tag,
                    Reason: reason,
                    WarnID: generateRandomCode(10),
                    Timestamp: Date.now()
                }
            }
        },
        { new: true, upsert: true }
    );

    const warnEmbed = new EmbedBuilder()
    .setAuthor({ name: `Warn Command ${config.devBy}`})
    .setColor(config.embedModHard) 
    .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
    .addFields(
        { name: `Warned User`, value: `> <@${targetUserId}>` },
        { name: `Reason`, value: `> ${reason}` },
        { name: `Warn ID`, value: `> ${warningData.Content[warningData.Content.length - 1].WarnID}` }
    )
    .setTimestamp()
    .setFooter({ text: `User ID: ${targetUserId}` })

    const user = interaction.options.getUser("user");

    const dmEmbed = new EmbedBuilder()
    .setAuthor({ name: `Warn Command ${config.devBy}`})
    .setColor(config.embedModHard)
    .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
    .setDescription(`You have been warned in **${interaction.guild.name}**`)
    .addFields(
        { name: `Reason`, value: `> ${reason}` },
        { name: `Warn ID`, value: `> ${warningData.Content[warningData.Content.length - 1].WarnID}` }
    )
    .setTimestamp()
    .setFooter({ text: `You have been warned!` })
    .setThumbnail(interaction.guild.iconURL())

    await interaction.reply({ embeds: [warnEmbed] });
    await user.send({ embeds: [dmEmbed] });
}

async function editWarn(interaction, targetUserId, warnId, newReason) {
    const warningData = await warningSchema.findOne({ GuildID: interaction.guild.id, UserID: targetUserId });
    const editEmbed = new EmbedBuilder().setColor(config.embedModHard); 

    if (!warningData) {
        editEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
        .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
        .setDescription(`User with ID ${targetUserId} has **no** warnings.`)
        .setFooter({ text: `Edit warning failed`})
        .setTimestamp();
    } else {
        const warning = warningData.Content.find(w => w.WarnID === warnId);
        if (!warning) {
            editEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
            .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
            .setDescription(`Warn ID ${warnId} not found.`)
            .setFooter({ text: `Edit warning failed`})
            .setTimestamp();
        } else {
            const oldReason = warning.Reason;
            warning.Reason = newReason;
            warning.Edits = warning.Edits || [];
            warning.Edits.push({
                EditedByExecuterId: interaction.user.id,
                EditedByExecuterTag: interaction.user.tag,
                NewReason: newReason,
                OldReason: oldReason,
                EditTimestamp: Date.now()
            });

            await warningData.save();

            editEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
            .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
            .setDescription(`Warn ID **${warnId}** has been edited.`)
            .addFields(
                { name: `Old Reason`, value: `> ${oldReason}` },
                { name: `New Reason`, value: `> ${newReason}` }
            )
            .setFooter({ text: `Edit warning successful`})
            .setTimestamp();
        }
    }

    await interaction.reply({ embeds: [editEmbed] });
}

async function clearWarns(interaction, targetUserId) {
    await warningSchema.findOneAndDelete({ GuildID: interaction.guild.id, UserID: targetUserId });
    const clearEmbed = new EmbedBuilder()
    .setAuthor({ name: `Warn Command ${config.devBy}`})
    .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
    .setColor(config.embedModHard) 
    .setDescription(`Warnings cleared for user: <@${targetUserId}>`)
    .setFooter({ text: `User ID: ${targetUserId}` })
    .setTimestamp();

    await interaction.reply({ embeds: [clearEmbed] });
}

async function removeWarn(interaction, targetUserId, warnId) {
    const warningData = await warningSchema.findOne({ GuildID: interaction.guild.id, UserID: targetUserId });
    const removeEmbed = new EmbedBuilder().setColor(config.embedModHard);

    if (!warningData) {
        removeEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
        .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
        .setDescription(`User: <@${targetUserId}> has no warnings.`)
        .setFooter({ text: `User ID: ${targetUserId}`})
        .setTimestamp();
    } else {
        const index = warningData.Content.findIndex(w => w.WarnID === warnId);
        if (index === -1) {
            removeEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
            .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
            .setDescription(`Warn ID ${warnId} not found.`)
            .setFooter({ text: `Edit warning failed`})
            .setTimestamp();
        } else {
            warningData.Content.splice(index, 1);
            await warningData.save();
            removeEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
            .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
            .setDescription(`Warning removed for user: <@${targetUserId}>`)
            .addFields(
                { name: `Warn ID`, value: `> ${warnId}` }
            )
            .setFooter({ text: `User ID: ${targetUserId}`})
            .setTimestamp();
        }
    }

    await interaction.reply({ embeds: [removeEmbed] });
}

async function listWarns(interaction, targetUserId) {
    const targetUser = interaction.options.getUser('user');
    const targetUserd = targetUser ? targetUser.id : interaction.user.id; 

    const warningData = await warningSchema.findOne({ GuildID: interaction.guild.id, UserID: targetUserd });
    const listEmbed = new EmbedBuilder().setColor(config.embedModHard);

    if (!warningData || !warningData.Content.length) {
        listEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
        .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
        .setDescription(`User with ID ${targetUserId} has **no** warnings.`)
        .setFooter({ text: `Edit warning failed`})
        .setTimestamp();
    } else {
        const warnIDs = warningData.Content.map(w => w.WarnID).join(', ');
        listEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
        .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
        .setDescription(`Warnings for User: <@${targetUserd}> \n\n> Warn IDs: ${warnIDs}`)
        .setFooter({ text: `User ID: ${targetUserd}`})
        .setTimestamp();
    }

    await interaction.reply({ embeds: [listEmbed] });
}

async function getWarnInfo(interaction, targetUserId, warnId) {
    try {

        const warningData = await warningSchema.findOne({ GuildID: interaction.guild.id, UserID: targetUserId });

        const infoEmbed = new EmbedBuilder().setColor(config.embedModHard);

        if (!warningData) {
            infoEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
            .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
            .setDescription(`User with ID ${targetUserId} has **no** warnings.`)
            .setFooter({ text: `Edit warning failed`})
            .setTimestamp();;
        } else {
            const warning = warningData.Content.find(w => w.WarnID === warnId);

            if (!warning) {
                infoEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
                .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
                .setDescription(`Warn ID ${warnId} not found.`)
                .setFooter({ text: `Edit warning failed`})
                .setTimestamp();;
            } else {
                infoEmbed.setAuthor({ name: `Warn Command ${config.devBy}`})
                .setTitle(`${config.modEmojiHard}  warn tool ${config.arrowEmoji}`)
                .setDescription(`Warning information for User: <@${targetUserId}> (${targetUserId})`)
                .addFields(
                    { name: `Warn ID`, value: `> ${warnId}` },
                    { name: `Issued by`, value: `> ${warning.ExecuterTag}` },
                    { name: `Reason`, value: `> ${warning.Reason}` },
                    { name: `Issued on`, value: `> <t:${Math.floor(warning.Timestamp / 1000)}:f>` }
                )
                .setFooter({ text: `Warnings List`})
                .setTimestamp();
            }
        }

        await interaction.reply({ embeds: [infoEmbed] });
    } catch (error) {
        await interaction.reply({ content: "An **error** occurred while retrieving __warning information__.", ephemeral: true });
    }
}

function generateRandomCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }

    return result;
}