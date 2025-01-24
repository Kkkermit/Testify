const { Events } = require('discord.js');
const Prefix = require('../../schemas/prefixSystem'); 

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        const newPrefix = new Prefix({
            Guild: guild.id,
            Prefix: Prefix.schema.path('Prefix').defaultValue, 
        });
        newPrefix.save();
    }
}