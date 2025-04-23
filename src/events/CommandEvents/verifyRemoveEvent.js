const { Events } = require('discord.js');
const capschema = require('../../schemas/verifySystem');
const verifyusers = require('../../schemas/verifyUsersSystem'); 

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        
        try {
            if (!member || !member.guild) return;
            
            const userId = member.user?.id;
            if (!userId) return;
            
            const userverdata = await verifyusers.findOne({ Guild: member.guild.id, User: userId });
            const verificationdata = await capschema.findOne({ Guild: member.guild.id });
            
            if (userverdata && verificationdata) {
                await capschema.updateOne({ Guild: member.guild.id }, { $pull: { Verified: userId } });
                await verifyusers.deleteOne({ Guild: member.guild.id, User: userId });
            }
        } catch (err) {
            console.error(`[VERIFY_ERROR] Error deleting data for user that left server:`, err);
            if (client?.logs?.error) {
                client.logs.error(`[VERIFY_ERROR] Error deleting the data from the user that left the server! ${err}`);
            }
        }
    }
};