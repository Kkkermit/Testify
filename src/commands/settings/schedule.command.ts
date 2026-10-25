import { PermissionFlagsBits } from "discord.js";
import { defineCommand, inGuild } from "@core/command";
import { reply } from "@lib/discord";
import {
	addSchedule,
	postIn,
	readSchedules,
	REPEAT_LABELS,
	SCHEDULE_COMMAND,
	scheduleEditor,
	scheduleHub,
} from "@lib/scheduledMessages";
import { SCHEDULE_LIMITS, SCHEDULE_REPEATS, type ScheduleRepeat } from "@testify/shared";

const isRepeat = (value: string | null): value is ScheduleRepeat =>
	(SCHEDULE_REPEATS as readonly (string | null)[]).includes(value);

/** Messages the bot posts later, once or every day or week, made and changed from one panel. */
export default defineCommand({
	name: SCHEDULE_COMMAND,
	description: "Posts a message later, once or every day or week.",
	category: "settings",
	guildOnly: true,
	permissions: [PermissionFlagsBits.ManageGuild],
	subcommands: [
		{
			name: "add",
			description: "Schedules a message, like /schedule add channel:#news in:2h repeat:once message:Hello.",
			private: true,
			// The message is last so a prefix run can write it without quotes.
			options: [
				{ name: "channel", description: "Where to post it.", type: "channel", required: true },
				{ name: "in", description: "How long from now, like 30m, 2h or 3d.", type: "string", required: true },
				{
					name: "repeat",
					description: "Once, or every day or week from then.",
					type: "string",
					required: true,
					choices: SCHEDULE_REPEATS.map((repeat) => ({ name: REPEAT_LABELS[repeat], value: repeat })),
				},
				{
					name: "message",
					description: "What to post. Nobody it mentions is pinged.",
					type: "string",
					required: true,
					maxLength: SCHEDULE_LIMITS.maxMessage,
				},
			],
			async run(interaction) {
				const guild = inGuild(interaction);
				const repeat = interaction.options.getString("repeat", true);

				const schedule = await addSchedule(
					guild,
					{
						channelId: interaction.options.getChannel("channel", true).id,
						message: interaction.options.getString("message", true),
						repeat: isRepeat(repeat) ? repeat : "once",
						nextAt: postIn(interaction.options.getString("in", true)),
					},
					interaction.user.id,
				);

				await reply(interaction, scheduleEditor({ schedule, note: "Scheduled." }, interaction.user.id));
			},
		},
		{
			name: "list",
			description: "Shows the scheduled messages, and changes or deletes them.",
			aliases: ["schedules"],
			private: true,
			async run(interaction) {
				const guild = inGuild(interaction);

				await reply(interaction, scheduleHub((await readSchedules(guild)).messages, interaction.user.id));
			},
		},
	],
});
