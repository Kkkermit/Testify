const { MessageFlags } = require("discord.js");

function checkDmUsability(command, interaction) {
	if (interaction.guild) return true;

	if (!interaction.guild && command.usableInDms !== true) {
		interaction.reply({ content: `\`${command.data.name}\` **cannot** be used in direct messages. Please navigate to a server to use this command.`, flags: MessageFlags.Ephemeral });
		return false;
	}

	return true;
}

function checkMessageDmUsability(command, message) {
	if (message.guild) return true;

	if (!message.guild && command.usableInDms !== true) {
		message.reply(`\`${command.name}\` **cannot** be used in direct messages. Please navigate to a server to use this command.`);
		return false;
	}

	return true;
}

module.exports = { 
	checkDmUsability, 
	checkMessageDmUsability, 
};
