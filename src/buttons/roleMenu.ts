import { MessageFlags } from "discord.js";
import { defineButton } from "@core/button";
import { checkOpenControl, refusalText } from "@core/checks";
import { UserFacingError } from "@core/errors";
import { findRoleMenu } from "@database/repositories/roleMenuRepository";
import { applyRolePicks, offeredRoles, pickNote, ROLE_MENU_ID, roleMenuPicker } from "@lib/roles";

/** The public post's button and the private menu it opens; anybody in the server may press them. */
export default defineButton({
	id: ROLE_MENU_ID,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null || !interaction.isMessageComponent()) return;

		const refused = await checkOpenControl(
			context.client,
			{ userId: interaction.user.id, guildId: guild.id },
			"role-menu",
		);
		if (refused !== null) throw new UserFacingError(refusalText(refused));

		const [menuId = ""] = context.args;
		const menu = await findRoleMenu(guild.id, menuId);
		if (menu === null) throw new UserFacingError("This role menu has been deleted. Ask a manager for a new one.");

		const member = await guild.members.fetch(interaction.user.id).catch(() => null);
		if (member === null) throw new UserFacingError("I could not find you in this server.");

		if (context.action === "open" && interaction.isButton()) {
			await interaction.reply({
				...roleMenuPicker(menu, offeredRoles(guild, menu, member)),
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			});
			return;
		}

		if (context.action !== "pick" || !interaction.isStringSelectMenu()) return;

		const outcome = await applyRolePicks(guild, menu, member, interaction.values);
		const names = (ids: string[]): string[] => ids.map((id) => guild.roles.cache.get(id)?.name ?? "a deleted role");
		const refreshed = await guild.members.fetch({ user: member.id, force: true }).catch(() => member);

		await interaction.update(
			roleMenuPicker(
				menu,
				offeredRoles(guild, menu, refreshed),
				pickNote({ added: names(outcome.added), removed: names(outcome.removed), refused: names(outcome.refused) }),
			),
		);
	},
});
