import { defineCommand } from "@core/command";
import { listReminders } from "@database/repositories/reminderRepository";
import { reply } from "@lib/discord";
import { REMINDER_LIMITS, reminderConfirm, reminderList, setReminder } from "@lib/reminders";

/** Reminders a person sets for themselves, delivered later by a ping where they set it or by a DM. */
export default defineCommand({
	name: "remind",
	description: "Reminds you of something later.",
	category: "community",
	subcommands: [
		{
			name: "me",
			description: "Sets a reminder, like /remind me in:2h about:check the oven.",
			aliases: ["remindme"],
			private: true,
			options: [
				{ name: "in", description: "How long from now, like 10m, 2h or 3d.", type: "string", required: true },
				{
					name: "about",
					description: "What to remind you of.",
					type: "string",
					required: true,
					maxLength: REMINDER_LIMITS.maxText,
					// Somebody's reminder is their own business, so the operator's logs never see it.
					unlogged: true,
				},
			],
			async run(interaction) {
				const reminder = await setReminder({
					userId: interaction.user.id,
					guildId: interaction.guildId,
					channelId: interaction.guildId === null ? null : (interaction.channel?.id ?? null),
					when: interaction.options.getString("in", true),
					about: interaction.options.getString("about", true),
				});

				await reply(interaction, reminderConfirm(reminder, interaction.user.id));
			},
		},
		{
			name: "list",
			description: "Shows your reminders, and cancels any of them.",
			aliases: ["reminders"],
			private: true,
			async run(interaction) {
				await reply(interaction, reminderList(await listReminders(interaction.user.id), 0, interaction.user.id));
			},
		},
	],
});
