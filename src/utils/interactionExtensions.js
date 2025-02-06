const { MessageFlags } = require('discord.js');

function patchInteraction(interaction) {
    const original = interaction.reply.bind(interaction);
    
    interaction.reply = async function (options) {
        const ephemeral = options?.ephemeral || false;

        if (ephemeral) {
            options = { ...options, flags: MessageFlags.Ephemeral };
            delete options.ephemeral;
        }
        return original(options);
    };
}

module.exports = { patchInteraction };