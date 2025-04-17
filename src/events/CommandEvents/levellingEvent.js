const { Events } = require("discord.js");
const levelSchema = require("../../schemas/userLevelSystem");
const levelschema = require("../../schemas/levelSetupSystem");

module.exports = {
	name: Events.MessageCreate,
	async execute(message, client, err) {
		const { guild, author } = message;

		if (!message.guild || message.author.bot) return;
		
		const leveldata = await levelschema.findOne({ Guild: message.guild.id });

		if (!leveldata || leveldata.Disabled === "disabled") return;
		let multiplier = 1;

		multiplier = Math.floor(leveldata.Multi);

		if (!guild || author.bot) return;

		levelSchema.findOne({ Guild: guild.id, User: author.id }, async (err, data) => {
			if (err) throw err;

			if (!data) {
				levelSchema.create({
					Guild: guild.id,
					User: author.id,
					XP: 0,
					Level: 0,
				});
			}
		});

		const give = 1;
		const data = await levelSchema.findOne({ Guild: guild.id, User: author.id });

		if (!data) return;

        const requiredXP = data.Level * data.Level * 20 + 20;

		const levelUpChannelId = leveldata.LevelUpChannel;
        const targetChannel = levelUpChannelId === 'current' ? message.channel : message.guild.channels.cache.get(levelUpChannelId);

		if (data.XP + give >= requiredXP) {
			data.XP += give;
			data.Level += 1;
			await data.save();

			const messages = [
				`Congratulations <@${author.id}>! You have leveled up to level **${data.Level}**! ${client.config.confettiEmoji}`,
				`<@${author.id}> has leveled up to level **${data.Level}**! Congrats! ${client.config.confettiEmoji}`,
				`Well done <@${author.id}>! You have leveled up to level **${data.Level}**! ${client.config.confettiEmoji}`,
				`Woohoo! <@${author.id}> has leveled up to level **${data.Level}**! ${client.config.confettiEmoji}`,
				`Hey! <@${author.id}> has leveled up to level **${data.Level}**! ${client.config.confettiEmoji}`,
				`Wow! <@${author.id}> has leveled up to level **${data.Level}**! ${client.config.confettiEmoji}`,
			];

			const randomLevelMessage = messages[Math.floor(Math.random() * messages.length)];

			if (targetChannel) {
				await targetChannel.send({ content: `${randomLevelMessage}` }).catch((err) => client.logs.error("[LEVEL_ERROR] Error sending level up message!"));
			} else {
				await message.channel.send({ content: `${randomLevelMessage}` }).catch((err) => client.logs.error("[LEVEL_ERROR] Error sending level up message!"));
			}
		} else {
			if (message.member.roles.cache.find((r) => r.id === leveldata.Role)) {
				data.XP += give * multiplier;
			}
			data.XP += give;
			data.save();
		}
	},
};
