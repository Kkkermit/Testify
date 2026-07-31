import { type Guild, PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getAutoRoles, setAutoRoles } from "@database/repositories/settingsRepository";
import { AUTOROLE_PANEL_ID, autoRolePanel, MAX_AUTO_ROLES } from "@lib/autoRolePanel.util";

/** Every control on the auto-role panel. */
export function unusableRoles(guild: Guild, roleIds: readonly string[]): string[] {
	const ceiling = guild.members.me?.roles.highest.position ?? Number.POSITIVE_INFINITY;

	return roleIds.filter((roleId) => {
		const role = guild.roles.cache.get(roleId);
		return role === undefined || role.managed || role.position >= ceiling;
	});
}

export default defineButton({
	id: AUTOROLE_PANEL_ID,
	ownerOnly: true,

	async run(interaction, context) {
		if (interaction.guild === null) return;
		if (!interaction.isMessageComponent()) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles) !== true) {
			throw new UserFacingError("You need the Manage Roles permission to change the auto-roles.");
		}

		const guild = interaction.guild;
		const ownerId = interaction.user.id;

		const show = async (roleIds: string[], note?: string): Promise<void> => {
			await interaction.update(
				autoRolePanel(
					{ roleIds, unusable: unusableRoles(guild, roleIds), ...(note !== undefined ? { note } : {}) },
					ownerId,
				),
			);
		};

		switch (context.action) {
			case "roles": {
				if (!interaction.isRoleSelectMenu()) return;

				const roleIds = interaction.values.slice(0, MAX_AUTO_ROLES);
				await setAutoRoles(guild.id, roleIds);
				await show(roleIds);
				return;
			}

			case "clear": {
				await setAutoRoles(guild.id, []);
				await show([], "New members are given nothing.");
				return;
			}

			default:
				return;
		}
	},
});

/** Re-read here so the command and the handler cannot disagree on what is stored. */
export async function currentRoles(guildId: string): Promise<string[]> {
	return (await getAutoRoles(guildId))?.roleIds ?? [];
}
