const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const autoRoleSchema = require("../../schemas/autoRoleSystem");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("An auto role system!")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(command => command.setName("add").setDescription("Add an auto-role trigger").addRoleOption(option => option.setName("role").setDescription("The role to add when a member joins.").setRequired(true)))
    .addSubcommand(command => command.setName("remove").setDescription("Remove an auto-role trigger").addRoleOption(option => option.setName("role").setDescription("The role to remove from the list of triggers.").setRequired(true)))
    .addSubcommand(command => command.setName("disable").setDescription("Disable the whole system"))
    .addSubcommand(command => command.setName("list").setDescription("List all the roles in the system.")),
    async execute(interaction, client) {

        const { options, guildId } = interaction;
        const data = await autoRoleSchema.findOne({ GuildID: guildId });
        const role = options.getRole("role");
        const sub = options.getSubcommand();
    
        const embed = new EmbedBuilder();
    
        const bot = interaction.guild.members.me;

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return await interaction.reply({ content: `${client.config.noPerms}`, ephemeral: true});
    
        if (role && role.position > bot.roles.highest.position) return await interaction.reply({ content: "I **cannot** manager that role as it is higher than mine!", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        async function dataCheck() {
            if (!data) 
                await interaction.editReply({ content: "The **auto-role** system is not setup in this server!", ephemeral: true });
            return data;
        }

        switch (sub) {
            case "add":
            
            if (!data) {
            await autoRoleSchema.create({ GuildID: guildId, Roles: [role.id] });
            embed
                .setAuthor({ name: `Auto Role System ${client.config.devBy}` })
                .setColor(client.config.embedModLight)
                .setTitle(`${client.user.username} Auto Role System ${client.config.arrowEmoji}`)
                .setDescription(`> Added a new role to the auto-role system!`)
                .addFields({ name: "Role", value: `> <@&${role.id}>` })
                .setFooter({ text: `Auto Role System | Role Added` })
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();
            } else {
                data.Roles.push(role.id);
                await data.save();

            embed
                .setAuthor({ name: `Auto Role System ${client.config.devBy}` })
                .setColor(client.config.embedModLight)
                .setTitle(`${client.user.username} Auto Role System ${client.config.arrowEmoji}`)
                .setDescription(`> Added a new role to the auto-role system!`)
                .addFields({ name: "Role", value: `> <@&${role.id}>` })
                .setFooter({ text: `Auto Role System | Role Added` })
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();
            }
            await interaction.editReply({ embeds: [embed] });
            break;

            case "remove":
            if (!(await dataCheck())) return;
    
            let find = data.Roles.find((rID) => rID == role.id);
    
            if (!find)
                return await interaction.editReply({ content: `<@&${role.id}> is not added in the auto-role system!`});

            let filter = data.Roles.filter((id) => id !== find);

            data.Roles = filter;
            await data.save();
            embed
                .setAuthor({ name: `Auto Role System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Auto Role System ${client.config.arrowEmoji}`)
                .setDescription(`> Removed a role from the auto-role system!`)
                .setColor(client.config.embedModLight)
                .setFooter({ text: `Auto Role System | Role Removed` })
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp()
                .addFields({ name: "Role", value: `> <@&${role.id}>` });

            await interaction.editReply({ embeds: [embed] });
            break;
    
            case "disable":
            if (!(await dataCheck())) return;
    
            await autoRoleSchema.findOneAndDelete({ GuildID: guildId });
            embed
                .setColor(client.config.embedModLight)
                .setAuthor({ name: `Auto Role System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Auto Role System ${client.config.arrowEmoji}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: `Auto Role System | Disabled` })
                .setTimestamp()
                .setDescription("> Disabled auto role system!");

            await interaction.editReply({ embeds: [embed] });
            break;

            case "list":
            if (!(await dataCheck())) return;
            embed
                .setColor(client.config.embedModLight)
                .setAuthor({ name: `Auto Role System ${client.config.devBy}` })
                .setTitle(`${client.user.username} Auto Role System ${client.config.arrowEmoji}`)
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: `Auto Role System | List` })
                .setTimestamp()
                .setDescription(`**All roles**:\n> ${data.Roles.map((r) => `<@&${r}>`).join(" ")}`);

            await interaction.editReply({ embeds: [embed] });
            break;
        }
    },
};