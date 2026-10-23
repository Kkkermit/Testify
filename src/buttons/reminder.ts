import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	cancelReminder,
	findReminder,
	listReminders,
	setReminderDelivery,
} from "@database/repositories/reminderRepository";
import { canPingHere, REMINDER_ID, reminderCancelled, reminderConfirm, reminderList } from "@lib/reminders";

/** The buttons on a reminder's confirmation and on `/remind list`; only the reminder's owner can press them. */
export default defineButton({
	id: REMINDER_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (!interaction.isButton()) return;

		const ownerId = interaction.user.id;
		const [reminderId = "", page = "0"] = context.args;

		switch (context.action) {
			case "deliver": {
				const reminder = await findReminder(ownerId, reminderId);
				if (reminder === null) throw new UserFacingError("That reminder has already gone off or been cancelled.");
				if (!canPingHere(reminder)) return;

				const changed = await setReminderDelivery(ownerId, reminderId, reminder.deliver === "dm" ? "channel" : "dm");
				if (changed === null) throw new UserFacingError("That reminder has already gone off or been cancelled.");

				await interaction.update(reminderConfirm(changed, ownerId));
				return;
			}

			case "cancel": {
				const reminder = await findReminder(ownerId, reminderId);
				if (reminder === null || !(await cancelReminder(ownerId, reminderId))) {
					throw new UserFacingError("That reminder has already gone off or been cancelled.");
				}

				await interaction.update(reminderCancelled(reminder));
				return;
			}

			case "drop": {
				const cancelled = await cancelReminder(ownerId, reminderId);
				const note = cancelled ? "Cancelled." : "That one had already gone off.";

				await interaction.update(reminderList(await listReminders(ownerId), Number(page), ownerId, note));
				return;
			}

			case "goto": {
				// The page sits after the unused key in the navigation row's custom ID.
				const [, target = "0"] = context.args;
				await interaction.update(reminderList(await listReminders(ownerId), Number(target), ownerId));
				return;
			}

			default:
				return;
		}
	},
});
