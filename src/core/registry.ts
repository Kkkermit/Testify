import { type ClientEvents } from "discord.js";
import { isCategory } from "../config/categories";
import { type SharedCommand } from "./command";
import { type ComponentHandler } from "./component";
import { type TestifyClient } from "./client";
import { isNamespace } from "./customId";
import { type AnyEventHandler } from "./event";
import { type Logger } from "./logger";
import { loadModules, modulePattern } from "./loader";
import { type MessagePipeline, type MessageProcessor } from "./messagePipeline";

function fail(file: string, reason: string): never {
	throw new Error(`${file}: ${reason}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

export function validateCommand(mod: unknown, file: string): SharedCommand {
	if (!isRecord(mod)) fail(file, "command module must export an object");
	if (typeof mod.name !== "string" || mod.name.length === 0) fail(file, "missing `name`");
	if (typeof mod.description !== "string" || mod.description.length === 0) fail(file, "missing `description`");
	if (typeof mod.category !== "string" || !isCategory(mod.category))
		fail(file, `invalid category: ${String(mod.category)}`);
	if (!Array.isArray(mod.surfaces) || mod.surfaces.length === 0) fail(file, "missing `surfaces`");
	for (const surface of mod.surfaces) {
		if (surface !== "slash" && surface !== "prefix") fail(file, `unknown surface: ${String(surface)}`);
	}
	if (typeof mod.execute !== "function") fail(file, "missing `execute`");
	return mod as unknown as SharedCommand;
}

export function validateEvent(mod: unknown, file: string): AnyEventHandler {
	if (!isRecord(mod)) fail(file, "event module must export an object");
	if (typeof mod.name !== "string" || mod.name.length === 0) fail(file, "missing `name`");
	if (typeof mod.execute !== "function") fail(file, "missing `execute`");
	return mod as unknown as AnyEventHandler;
}

export function validateComponent(mod: unknown, file: string): ComponentHandler {
	if (!isRecord(mod)) fail(file, "component module must export an object");
	if (typeof mod.namespace !== "string" || !isNamespace(mod.namespace)) {
		fail(file, `namespace must be registered in core/customId.ts: ${String(mod.namespace)}`);
	}
	if (typeof mod.handle !== "function") fail(file, "missing `handle`");
	return mod as unknown as ComponentHandler;
}

export function validateMessageProcessor(mod: unknown, file: string): MessageProcessor {
	if (!isRecord(mod)) fail(file, "message processor must export an object");
	if (typeof mod.name !== "string" || mod.name.length === 0) fail(file, "missing `name`");
	if (typeof mod.run !== "function") fail(file, "missing `run`");
	return mod as unknown as MessageProcessor;
}

export interface RegistryCounts {
	commands: number;
	events: number;
	components: number;
	messageProcessors: number;
}

export function registerCommands(client: TestifyClient, logger: Logger): number {
	const loaded = loadModules(modulePattern("features/*/commands/**/*"), validateCommand, logger);

	for (const { module: command, file } of loaded) {
		if (client.commands.has(command.name)) {
			throw new Error(`${file}: duplicate command name "${command.name}"`);
		}
		client.commands.set(command.name, command);

		for (const alias of command.aliases ?? []) {
			const existing = client.aliases.get(alias);
			if (existing !== undefined) {
				throw new Error(`${file}: alias "${alias}" already claimed by "${existing}"`);
			}
			if (client.commands.has(alias)) {
				throw new Error(`${file}: alias "${alias}" collides with a command name`);
			}
			client.aliases.set(alias, command.name);
		}
	}

	return loaded.length;
}

export function registerComponents(client: TestifyClient, logger: Logger): number {
	const loaded = loadModules(modulePattern("features/*/components/**/*"), validateComponent, logger);

	for (const { module: handler, file } of loaded) {
		if (client.components.has(handler.namespace)) {
			throw new Error(`${file}: duplicate component namespace "${handler.namespace}"`);
		}
		client.components.set(handler.namespace, handler);
	}

	return loaded.length;
}

export function registerMessageProcessors(pipeline: MessagePipeline, logger: Logger): number {
	const loaded = loadModules(modulePattern("features/*/messages/**/*"), validateMessageProcessor, logger);
	for (const { module: processor } of loaded) pipeline.register(processor);
	return loaded.length;
}

export function registerEvents(client: TestifyClient, logger: Logger): number {
	const loaded = [
		...loadModules(modulePattern("events/**/*"), validateEvent, logger),
		...loadModules(modulePattern("features/*/events/**/*"), validateEvent, logger),
	];

	for (const { module: handler } of loaded) {
		const name = handler.name;
		const invoke = (...args: ClientEvents[keyof ClientEvents]): void => {
			void Promise.resolve(handler.execute(client, ...args)).catch((error: unknown) => {
				logger.error({ event: name, err: error }, "Event handler failed");
			});
		};

		if (handler.once === true) {
			client.once(name, invoke);
		} else {
			client.on(name, invoke);
		}
	}

	return loaded.length;
}

/** Loads and registers everything the client dispatches from. */
export function registerAll(client: TestifyClient, pipeline: MessagePipeline, logger: Logger): RegistryCounts {
	const components = registerComponents(client, logger);
	const commands = registerCommands(client, logger);
	const messageProcessors = registerMessageProcessors(pipeline, logger);
	const events = registerEvents(client, logger);
	return { commands, events, components, messageProcessors };
}
