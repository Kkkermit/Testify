import { ButtonStyle } from "discord.js";
import { customId } from "@core/button";
import { type StoredRoleMenu } from "@database/repositories/roleMenuRepository";
import { button, channelSelect, option, roleSelect, row, select } from "@lib/discord/components.util";
import { container, containerMessage, divider, sectionWithButton, text } from "@lib/discord/containers.util";
import { type ContainerMessage, type ContainerPart } from "@lib/discord/discord.types";
import { ROLE_MENU_ADMIN_ID, ROLE_MENU_ID } from "@lib/roles/roles.constants";
import { settingsScreen, type ScreenAction, type ScreenRow } from "@lib/settings/settingsScreen.util";
import { ROLE_MENU_LIMITS } from "@testify/shared";

/** A role on a menu as one member sees it: whether they hold it, and whether the bot can hand it out at all. */
export interface OfferedRole {
	id: string;
	name: string;
	held: boolean;
	available: boolean;
}

function holdLine(menu: Pick<StoredRoleMenu, "mode">): string {
	return menu.mode === "one" ? "You can hold one of these at a time." : "Pick as many as you like.";
}

/** The message members see in the channel; their own choices happen privately, so it is the same for everybody. */
export function roleMenuPost(menu: StoredRoleMenu): ContainerMessage {
	const parts: ContainerPart[] = [text(`## ${menu.title}`)];
	if (menu.description !== "") parts.push(text(menu.description));

	parts.push(
		divider(),
		text(menu.roleIds.map((roleId) => `<@&${roleId}>`).join("\n")),
		row(
			button({
				id: customId(ROLE_MENU_ID, "open", menu.id),
				label: "Choose your roles",
				emoji: "🎭",
				style: ButtonStyle.Primary,
			}),
		),
		text(`-# ${holdLine(menu)} Choosing again changes what you have.`),
	);

	return containerMessage(container({ category: "settings", parts }));
}

/** What a member gets on pressing the post: the menu pre-ticked with the roles they already hold. */
export function roleMenuPicker(menu: StoredRoleMenu, roles: OfferedRole[], note?: string): ContainerMessage {
	const offered = roles.filter((role) => role.available);
	const missing = roles.filter((role) => !role.available);
	const parts: ContainerPart[] = [text(`## ${menu.title}\n${holdLine(menu)} What is ticked is what you have.`)];

	if (note !== undefined) parts.push(text(`-# ${note}`));

	if (offered.length === 0) {
		parts.push(text("None of these roles can be handed out right now. Ask a manager to check the menu."));
	} else {
		// Discord refuses a single-choice menu with two defaults, so only the first held role is shown ticked.
		const firstHeld = offered.find((role) => role.held)?.id;
		const ticked = (role: OfferedRole): boolean => (menu.mode === "one" ? role.id === firstHeld : role.held);

		parts.push(
			row(
				select({
					id: customId(ROLE_MENU_ID, "pick", menu.id),
					placeholder: "Your roles…",
					minValues: 0,
					maxValues: menu.mode === "one" ? 1 : offered.length,
					options: offered.map((role) => option({ label: role.name, value: role.id, selected: ticked(role) })),
				}),
			),
		);
	}

	if (missing.length > 0) {
		parts.push(text(`-# Not on offer right now: ${missing.map((role) => role.name).join(", ")}.`));
	}

	return containerMessage(container({ category: "settings", parts }));
}

/** What a pick did, in one line. */
export function pickNote(names: { added: string[]; removed: string[]; refused: string[] }): string {
	const lines: string[] = [];
	if (names.added.length > 0) lines.push(`Added ${names.added.join(", ")}.`);
	if (names.removed.length > 0) lines.push(`Removed ${names.removed.join(", ")}.`);
	if (names.refused.length > 0) lines.push(`Could not change ${names.refused.join(", ")}.`);

	return lines.length === 0 ? "Nothing changed." : lines.join(" ");
}

/** Every menu in the server, each with its own Edit button. */
export function roleMenuHub(menus: StoredRoleMenu[], ownerId: string, note?: string): ContainerMessage {
	const full = menus.length >= ROLE_MENU_LIMITS.maxPerGuild;
	const parts: ContainerPart[] = [
		text(
			`## 🎭 Role menus\n${
				menus.length === 0
					? "None yet. Make one, then post it where members will see it."
					: `${String(menus.length)} of ${String(ROLE_MENU_LIMITS.maxPerGuild)} menus.`
			}`,
		),
	];
	if (note !== undefined) parts.push(text(`-# ${note}`));

	for (const menu of menus) {
		const roles = `${String(menu.roleIds.length)} ${menu.roleIds.length === 1 ? "role" : "roles"}`;
		const where = menu.messageId === null ? "not posted yet" : "posted";

		parts.push(
			sectionWithButton(
				`**${menu.title}**\n<#${menu.channelId}> · ${roles} · ${where}`,
				button({ id: customId(ROLE_MENU_ADMIN_ID, "edit", menu.id, ownerId), label: "Edit" }),
			),
		);
	}

	parts.push(
		row(
			button({
				id: customId(ROLE_MENU_ADMIN_ID, "new", ownerId),
				label: "New menu",
				emoji: "➕",
				style: ButtonStyle.Success,
				disabled: full,
			}),
		),
		text(
			full
				? "-# That is as many menus as a server can have. Delete one to make another."
				: "-# Members choose from a menu themselves. Roles that moderate or administer can never be offered.",
		),
	);

	return containerMessage(container({ category: "settings", parts }));
}

export interface RoleMenuEditorState {
	menu: StoredRoleMenu;
	/** Lines naming each role a pick refused, and why. */
	refused?: string[];
	note?: string;
	confirmingDelete?: boolean;
}

/** One menu: its wording, who may hold what, the roles on offer and where it is posted — each applied on the press. */
export function roleMenuEditor(state: RoleMenuEditorState, ownerId: string): ContainerMessage {
	const { menu } = state;
	const args = [menu.id];
	const posted = menu.messageId !== null;

	const rows: ScreenRow[] = [
		{
			label: "Wording",
			value: menu.description === "" ? "_No description._" : menu.description.slice(0, 300),
			action: { action: "text", label: "Edit wording", args },
		},
		{
			label: "Members may hold",
			value: menu.mode === "one" ? "One role from this menu" : "Any number of these roles",
			action: { action: "mode", label: menu.mode === "one" ? "Allow many" : "Allow only one", args },
		},
	];
	if ((state.refused ?? []).length > 0) {
		rows.push({ label: "⚠️ Not added", value: (state.refused ?? []).join("\n") });
	}

	const actions: ScreenAction[] = state.confirmingDelete
		? [
				{ action: "delete-yes", label: "Delete it", style: ButtonStyle.Danger, args },
				{ action: "delete-no", label: "Keep it", args },
			]
		: [
				{
					action: "post",
					label: posted ? "Update post" : "Post",
					style: ButtonStyle.Success,
					disabled: menu.roleIds.length === 0,
					args,
				},
				{ action: "delete", label: "Delete", style: ButtonStyle.Danger, args },
				{ action: "hub", label: "All menus" },
			];

	let status = posted
		? `Posted in <#${menu.channelId}>. Every change here updates it.`
		: `Not posted yet. It goes to <#${menu.channelId}> when you press Post.`;
	if (state.confirmingDelete) status = "Delete this menu? Its post comes down too, and nobody loses a role they hold.";

	return settingsScreen({
		id: ROLE_MENU_ADMIN_ID,
		ownerId,
		category: "settings",
		title: `🎭 ${menu.title}`,
		status,
		...(state.note !== undefined ? { note: state.note } : {}),
		rows,
		pickers: [
			{
				label: "Roles on offer",
				hint: "What is ticked is on the menu. A role above yours or mine, or one that moderates, is refused.",
				control: row(
					roleSelect({
						id: customId(ROLE_MENU_ADMIN_ID, "roles", menu.id, ownerId),
						placeholder: "Roles members may pick…",
						minValues: 0,
						maxValues: ROLE_MENU_LIMITS.maxRoles,
						defaultRoleIds: menu.roleIds,
					}),
				),
			},
			{
				label: "Posted in",
				control: row(
					channelSelect({
						id: customId(ROLE_MENU_ADMIN_ID, "channel", menu.id, ownerId),
						placeholder: "Channel for the menu…",
						defaultChannelIds: [menu.channelId],
					}),
				),
			},
		],
		actions,
	});
}
