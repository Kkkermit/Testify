import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	addAutoResponder,
	AUTO_RESPONDER_PANEL_ID,
	autoResponderEditor,
	autoResponderHub,
	editAutoResponder,
	nextMatch,
	readAutoResponder,
	readAutoResponders,
	removeAutoResponder,
} from "@lib/autoResponders";
import { type ContainerMessage, modalForm } from "@lib/discord";
import { AUTO_RESPONDER_LIMITS, type AutoResponder } from "@testify/shared";

/** Every control on `/auto-responder`: the list, and the editor each responder opens. */

async function show(interaction: ComponentInteraction, panel: ContainerMessage): Promise<void> {
	// A modal opened elsewhere cannot edit this message, so it answers privately instead.
	if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
		await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	} else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
		await interaction.update(panel);
	}
}

function responderForm(action: string, args: string[], responder?: AutoResponder): ReturnType<typeof modalForm> {
	return modalForm({
		id: AUTO_RESPONDER_PANEL_ID,
		action,
		args,
		title: responder === undefined ? "New auto-responder" : "Auto-responder",
		fields: [
			{
				id: "trigger",
				label: "The words it answers",
				maxLength: AUTO_RESPONDER_LIMITS.maxTrigger,
				placeholder: "how do i get roles",
				value: responder?.trigger ?? "",
			},
			{
				id: "reply",
				label: "What it replies",
				paragraph: true,
				maxLength: AUTO_RESPONDER_LIMITS.maxReply,
				placeholder: "Pick them in #roles.",
				value: responder?.reply ?? "",
			},
		],
	});
}

function typed(interaction: ComponentInteraction): { trigger: string; reply: string } {
	if (!interaction.isModalSubmit()) throw new UserFacingError("Open the form again and fill it in.");
	return {
		trigger: interaction.fields.getTextInputValue("trigger"),
		reply: interaction.fields.getTextInputValue("reply"),
	};
}

export default defineButton({
	id: AUTO_RESPONDER_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		// Checked on every press, because a role can be taken away while the panel is still open.
		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) !== true) {
			throw new UserFacingError("You need the Manage Server permission to change auto-responders.");
		}

		const ownerId = interaction.user.id;
		const [id = ""] = context.args;
		const hub = async (note?: string): Promise<void> =>
			show(interaction, autoResponderHub((await readAutoResponders(guild.id)).responders, ownerId, note));

		switch (context.action) {
			case "new":
				if (interaction.isButton()) await interaction.showModal(responderForm("create", [ownerId]));
				return;

			case "create": {
				const responder = await addAutoResponder(guild.id, { ...typed(interaction), match: "word" }, ownerId);
				await show(interaction, autoResponderEditor({ responder, note: "Added. It answers from now on." }, ownerId));
				return;
			}

			case "open": {
				if (!interaction.isStringSelectMenu()) return;
				const responder = await readAutoResponder(guild.id, interaction.values[0] ?? "");
				await show(interaction, autoResponderEditor({ responder }, ownerId));
				return;
			}

			case "edit":
				if (interaction.isButton()) {
					await interaction.showModal(responderForm("save", [id, ownerId], await readAutoResponder(guild.id, id)));
				}
				return;

			case "save": {
				const current = await readAutoResponder(guild.id, id);
				const responder = await editAutoResponder(
					guild.id,
					id,
					{ ...typed(interaction), match: current.match },
					ownerId,
				);
				await show(interaction, autoResponderEditor({ responder, note: "Saved." }, ownerId));
				return;
			}

			case "match": {
				const current = await readAutoResponder(guild.id, id);
				const responder = await editAutoResponder(
					guild.id,
					id,
					{ ...current, match: nextMatch(current.match) },
					ownerId,
				);
				await show(interaction, autoResponderEditor({ responder }, ownerId));
				return;
			}

			case "delete":
			case "delete-no":
				await show(
					interaction,
					autoResponderEditor(
						{ responder: await readAutoResponder(guild.id, id), confirmingDelete: context.action === "delete" },
						ownerId,
					),
				);
				return;

			case "delete-yes":
				await removeAutoResponder(guild.id, id);
				await hub("Deleted. It no longer answers.");
				return;

			case "hub":
				await hub();
				return;
		}
	},
});
