const { MessageFlags } = require("discord.js");

function checkUnderDevelopment(command, interaction) {
	if (!command.underDevelopment) return true;

	interaction.reply({ 
		content: `\`${command.data.name}\` **is currently under development** and not available for use at this time. Please try again later.`, 
		flags: MessageFlags.Ephemeral 
	});
	
	return false;
}

function checkMessageUnderDevelopment(command, message) {
	if (!command.underDevelopment) return true;

	message.reply(`\`${command.name}\` **is currently under development** and not available for use at this time. Please try again later.`);
	
	return false;
}

module.exports = { 
	checkUnderDevelopment, 
	checkMessageUnderDevelopment 
};
