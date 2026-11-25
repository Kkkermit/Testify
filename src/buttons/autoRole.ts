import { type Guild, PermissionFlagsBits } from "discord.js";
import { defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import { getAutoRoles, setAutoRoles } from "@database/repositories/autoRoleRepository";
import { chooserProblem, offerProblem, splitOffer } from "@lib/roles";
import { AUTOROLE_PANEL_ID, autoRolePanel, MAX_AUTO_ROLES, recordsSettings } from "@lib/settings";

export function unusableRoles(guild: Guild, roleIds: readonly string[]): string[] {
	const ceiling = guild.members.me?.roles.highest.position ?? Number.POSITIVE_INFINITY;

	return roleIds.filter((roleId) => {
		const role = guild.roles.cache.get(roleId);
		return role === undefined || role.managed || role.position >= ceiling;
	});
}

export default recordsSettings(
	["settings.auto-roles"],
	defineButton({
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

					const member = await guild.members.fetch(ownerId).catch(() => null);
					if (member === null) throw new UserFacingError("I could not find you in this server.");

					// Everybody who joins is given these, so nothing above the chooser and nothing that moderates.
					const { kept, refused } = splitOffer(interaction.values.slice(0, MAX_AUTO_ROLES), (roleId) =>
						chooserProblem(member, roleId, guild, offerProblem),
					);
					await setAutoRoles(guild.id, kept);
					await show(kept, refused.length > 0 ? refused.join("\n") : undefined);
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
	}),
);

export async function currentRoles(guildId: string): Promise<string[]> {
	return (await getAutoRoles(guildId))?.roleIds ?? [];
}
