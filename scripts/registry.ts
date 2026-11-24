import { Collection } from "discord.js";
import { type TestifyClient } from "@core/client";
import { type Command } from "@core/command";
import { type ContextMenu } from "@core/contextMenu";
import { loadEverything } from "@core/loader";
import { createLogger } from "@core/logger";

/** Every command and right-click action, loaded from disk as the bot loads them, with no Discord client behind them. */
export function loadRegistry(): TestifyClient {
	const client = {
		commands: new Collection<string, Command>(),
		aliases: new Collection<string, string>(),
		buttons: new Collection(),
		contextMenus: new Collection<string, ContextMenu>(),
		messageHandlers: [],
		logger: createLogger("fatal", false),
		on: () => undefined,
		once: () => undefined,
	} as unknown as TestifyClient;

	loadEverything(client);
	return client;
}
