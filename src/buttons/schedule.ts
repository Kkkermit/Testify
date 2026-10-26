import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { type ContainerMessage, modalForm, pickedChannelId } from "@lib/discord";
import {
	changeSchedule,
	nextRepeat,
	postIn,
	readSchedule,
	readSchedules,
	removeSchedule,
	SCHEDULE_PANEL_ID,
	scheduleEditor,
	scheduleHub,
} from "@lib/scheduledMessages";
import { SCHEDULE_LIMITS } from "@testify/shared";

/** Every control on `/schedule list`: the list, and the editor each scheduled message opens. */

async function show(interaction: ComponentInteraction, panel: ContainerMessage): Promise<void> {
	// A modal opened elsewhere cannot edit this message, so it answers privately instead.
	if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
		await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	} else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
		await interaction.update(panel);
	}
}

function typed(interaction: ComponentInteraction, field: string): string {
	if (!interaction.isModalSubmit()) throw new UserFacingError("Open the form again and fill it in.");
	return interaction.fields.getTextInputValue(field);
}

export default defineButton({
	id: SCHEDULE_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// Checked on every press, because a role can be taken away while the panel is still open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change scheduled messages.");
		}

		const ownerId = interaction.user.id;
		const [id = ""] = context.args;
		const editor = async (note?: string, confirmingDelete = false): Promise<void> =>
			show(
				interaction,
				scheduleEditor(
					{
						schedule: await readSchedule(guild, id),
						...(note === undefined ? {} : { note }),
						confirmingDelete,
					},
					ownerId,
				),
			);

		switch (context.action) {
			case "open": {
				if (!interaction.isStringSelectMenu()) return;
				const schedule = await readSchedule(guild, interaction.values[0] ?? "");
				await show(interaction, scheduleEditor({ schedule }, ownerId));
				return;
			}

			case "time":
				if (interaction.isButton()) {
					await interaction.showModal(
						modalForm({
							id: SCHEDULE_PANEL_ID,
							action: "save-time",
							args: [id, ownerId],
							title: "When to post it",
							fields: [{ id: "in", label: "How long from now", placeholder: "30m, 2h or 3d" }],
						}),
					);
				}
				return;

			case "save-time":
				await changeSchedule(guild, id, { nextAt: postIn(typed(interaction, "in")) }, ownerId);
				await editor("Moved.");
				return;

			case "edit":
				if (interaction.isButton()) {
					await interaction.showModal(
						modalForm({
							id: SCHEDULE_PANEL_ID,
							action: "save-message",
							args: [id, ownerId],
							title: "Scheduled message",
							fields: [
								{
									id: "message",
									label: "What to post",
									paragraph: true,
									maxLength: SCHEDULE_LIMITS.maxMessage,
									value: (await readSchedule(guild, id)).message,
								},
							],
						}),
					);
				}
				return;

			case "save-message":
				await changeSchedule(guild, id, { message: typed(interaction, "message") }, ownerId);
				await editor("Saved.");
				return;

			case "repeat": {
				const current = await readSchedule(guild, id);
				await changeSchedule(guild, id, { repeat: nextRepeat(current.repeat) }, ownerId);
				await editor();
				return;
			}

			case "channel": {
				const channelId = await pickedChannelId(interaction, guild);
				if (channelId === null) return;
				await changeSchedule(guild, id, { channelId }, ownerId);
				await editor(`It will post in <#${channelId}>.`);
				return;
			}

			case "delete":
			case "delete-no":
				await editor(undefined, context.action === "delete");
				return;

			case "delete-yes":
				await removeSchedule(guild, id);
				await show(
					interaction,
					scheduleHub((await readSchedules(guild)).messages, ownerId, "Deleted. It will not be posted."),
				);
				return;

			case "hub":
				await show(interaction, scheduleHub((await readSchedules(guild)).messages, ownerId));
				return;
		}
	},
});
