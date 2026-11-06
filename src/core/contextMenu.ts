import {
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	InteractionContextType,
	type MessageContextMenuCommandInteraction,
	type PermissionResolvable,
	PermissionsBitField,
	type UserContextMenuCommandInteraction,
} from "discord.js";
import { type TestifyClient } from "@core/client";

/** An action on a member's or a message's right-click menu, which works only in a server. */
interface MenuBase {
	/** Shown in the menu as written, so it is a short phrase in sentence case. */
	name: string;
	/** Discord shows no description for these, so this is only for the command list and the help article. */
	description: string;
	/** What the person needs; also registered as the default so Discord hides it from everybody else. */
	permissions?: PermissionResolvable[];
	botPermissions?: PermissionResolvable[];
	/** The command whose switch, pause and blacklist gate this, so turning `/warn` off turns Warn off too. */
	switchedBy: string;
}

export interface UserMenu extends MenuBase {
	type: "user";
	run(interaction: UserContextMenuCommandInteraction<"cached">, client: TestifyClient): Promise<void>;
}

export interface MessageMenu extends MenuBase {
	type: "message";
	run(interaction: MessageContextMenuCommandInteraction<"cached">, client: TestifyClient): Promise<void>;
}

export type ContextMenu = UserMenu | MessageMenu;

export function defineContextMenu<T extends ContextMenu>(menu: T): T {
	return menu;
}

export function buildContextMenu(menu: ContextMenu): ContextMenuCommandBuilder {
	return new ContextMenuCommandBuilder()
		.setName(menu.name)
		.setType(menu.type === "user" ? ApplicationCommandType.User : ApplicationCommandType.Message)
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(
			menu.permissions === undefined || menu.permissions.length === 0
				? null
				: new PermissionsBitField(menu.permissions).bitfield,
		);
}
