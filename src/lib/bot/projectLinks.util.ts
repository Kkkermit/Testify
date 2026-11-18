import { type ButtonBuilder } from "discord.js";
import { instanceConfig } from "@config/instance";
import { linkButton } from "@lib/discord/components.util";

/** Source code, then Support unless the host has no support server, from the copy's own config. */
export function projectLinkButtons(support = "Support server"): ButtonBuilder[] {
	const { repository, supportServer } = instanceConfig();
	const source = linkButton("Source code", repository);

	return supportServer === null ? [source] : [source, linkButton(support, supportServer)];
}
