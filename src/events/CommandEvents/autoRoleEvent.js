const { Events } = require('discord.js');
const roleSchema = require("../../schemas/autoRoleSystem");

module.exports = {
    name: Events.GuildMemberAdd,
    async execute (member) {

        const { guild } = member;

        const data = await roleSchema.findOne({ GuildID: guild.id });
        if (!data) return;
        if (data.Roles.length < 0) return;
        for (const r of data.Roles) {
            await member.roles.add(r);
        }
    }
}