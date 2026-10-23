import { type Guild, MessageFlags, PermissionFlagsBits } from "discord.js";
import { type ComponentInteraction, defineButton } from "@core/button";
import { UserFacingError } from "@core/errors";
import {
	countRoleMenus,
	createRoleMenu,
	deleteRoleMenu,
	findRoleMenu,
	listRoleMenus,
	type StoredRoleMenu,
} from "@database/repositories/roleMenuRepository";
import { type ContainerMessage, modalForm, pickedChannelId } from "@lib/discord";
import {
	changeRoleMenu,
	offerProblem,
	publishRoleMenu,
	ROLE_MENU_ADMIN_ID,
	roleMenuEditor,
	roleMenuHub,
	splitOffer,
	takeDownRoleMenu,
} from "@lib/roles";
import { ROLE_MENU_LIMITS, roleMenuBody } from "@testify/shared";

/** Every control on `/role-menu`: the list of menus, and the editor each one opens. */

async function show(interaction: ComponentInteraction, panel: ContainerMessage): Promise<void> {
	// A modal opened elsewhere cannot edit this message, so it answers privately instead.
	if (interaction.isModalSubmit() && !interaction.isFromMessage()) {
		await interaction.reply({ ...panel, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
	} else if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
		await interaction.update(panel);
	}
}

function wordingFrom(interaction: ComponentInteraction): { title: string; description: string } {
	if (!interaction.isModalSubmit()) throw new UserFacingError("Open the form again and fill it in.");

	const title = roleMenuBody.shape.title.safeParse(interaction.fields.getTextInputValue("title"));
	const description = roleMenuBody.shape.description.safeParse(interaction.fields.getTextInputValue("description"));
	if (!title.success) throw new UserFacingError("A menu needs a title of up to 80 characters, without HTML.");
	if (!description.success) throw new UserFacingError("Keep the description under 1,000 characters, without HTML.");

	return { title: title.data, description: description.data };
}

function wordingForm(action: string, args: string[], menu?: StoredRoleMenu): ReturnType<typeof modalForm> {
	return modalForm({
		id: ROLE_MENU_ADMIN_ID,
		action,
		args,
		title: menu === undefined ? "New role menu" : "Role menu wording",
		fields: [
			{
				id: "title",
				label: "Title",
				maxLength: ROLE_MENU_LIMITS.maxTitle,
				placeholder: "Pick your roles",
				value: menu?.title ?? "",
			},
			{
				id: "description",
				label: "Description",
				paragraph: true,
				required: false,
				maxLength: ROLE_MENU_LIMITS.maxDescription,
				placeholder: "What these roles are for, shown above the list.",
				value: menu?.description ?? "",
			},
		],
	});
}

async function menuOf(guild: Guild, menuId: string): Promise<StoredRoleMenu> {
	const menu = await findRoleMenu(guild.id, menuId);
	if (menu === null) throw new UserFacingError("That role menu has been deleted.");

	return menu;
}

export default defineButton({
	id: ROLE_MENU_ADMIN_ID,
	ownerOnly: true,

	async run(interaction, context) {
		const guild = interaction.guild;
		if (guild === null) return;

		if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles) !== true) {
			throw new UserFacingError("You need the Manage Roles permission to change role menus.");
		}

		const ownerId = interaction.user.id;
		const [menuId = ""] = context.args;
		const editor = (menu: StoredRoleMenu, extra: { note?: string; refused?: string[] } = {}): ContainerMessage =>
			roleMenuEditor({ menu, ...extra }, ownerId);
		const withNote = (note: string | null): { note?: string } => (note === null ? {} : { note });

		switch (context.action) {
			case "hub": {
				await show(interaction, roleMenuHub(await listRoleMenus(guild.id), ownerId));
				return;
			}

			case "new": {
				if (!interaction.isButton()) return;
				if ((await countRoleMenus(guild.id)) >= ROLE_MENU_LIMITS.maxPerGuild) {
					throw new UserFacingError("That is as many menus as a server can have. Delete one to make another.");
				}

				await interaction.showModal(wordingForm("new-save", [ownerId]));
				return;
			}

			case "new-save": {
				const wording = wordingFrom(interaction);
				if ((await countRoleMenus(guild.id)) >= ROLE_MENU_LIMITS.maxPerGuild) {
					throw new UserFacingError("That is as many menus as a server can have. Delete one to make another.");
				}

				// It starts in the channel the panel was opened in; the editor's picker moves it before it is posted.
				const channelId = interaction.channelId ?? guild.systemChannelId;
				if (channelId === null) throw new UserFacingError("Open `/role-menu` from a text channel.");

				const menu = await createRoleMenu(guild.id, { ...wording, channelId, roleIds: [], mode: "many" }, ownerId);
				await show(interaction, editor(menu, { note: "Made. Pick the roles to offer, then post it." }));
				return;
			}

			case "edit":
			case "delete-no": {
				await show(interaction, editor(await menuOf(guild, menuId)));
				return;
			}

			case "text": {
				if (!interaction.isButton()) return;
				await interaction.showModal(wordingForm("text-save", [menuId, ownerId], await menuOf(guild, menuId)));
				return;
			}

			case "text-save": {
				const wording = wordingFrom(interaction);
				const result = await changeRoleMenu(guild, await menuOf(guild, menuId), wording, ownerId);
				await show(interaction, editor(result.menu, withNote(result.note ?? "Wording saved.")));
				return;
			}

			case "mode": {
				const menu = await menuOf(guild, menuId);
				const mode = menu.mode === "one" ? "many" : "one";
				const result = await changeRoleMenu(guild, menu, { mode }, ownerId);
				await show(interaction, editor(result.menu, withNote(result.note)));
				return;
			}

			case "roles": {
				if (!interaction.isRoleSelectMenu()) return;

				const member = await guild.members.fetch(ownerId).catch(() => null);
				if (member === null) throw new UserFacingError("I could not find you in this server.");

				const { kept, refused } = splitOffer(interaction.values, (roleId) => offerProblem(member, roleId, guild));
				const result = await changeRoleMenu(guild, await menuOf(guild, menuId), { roleIds: kept }, ownerId);
				await show(interaction, editor(result.menu, { ...withNote(result.note), refused }));
				return;
			}

			case "channel": {
				const channelId = await pickedChannelId(interaction, guild);
				if (channelId === null) return;

				const result = await changeRoleMenu(guild, await menuOf(guild, menuId), { channelId }, ownerId);
				await show(interaction, editor(result.menu, withNote(result.note)));
				return;
			}

			case "post": {
				const menu = await menuOf(guild, menuId);
				const messageId = await publishRoleMenu(guild, menu);
				await show(interaction, editor({ ...menu, messageId }, { note: `Posted in <#${menu.channelId}>.` }));
				return;
			}

			case "delete": {
				await show(interaction, roleMenuEditor({ menu: await menuOf(guild, menuId), confirmingDelete: true }, ownerId));
				return;
			}

			case "delete-yes": {
				const menu = await menuOf(guild, menuId);
				await takeDownRoleMenu(guild, menu);
				await deleteRoleMenu(guild.id, menu.id);
				await show(interaction, roleMenuHub(await listRoleMenus(guild.id), ownerId, `Deleted ${menu.title}.`));
				return;
			}

			default:
				return;
		}
	},
});
