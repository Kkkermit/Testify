import { type CommandOptionSummary, type CommandSummary } from "@testify/shared";

type ArgValue = string | number | boolean;

type ControlKind = "text" | "number" | "boolean" | "choice" | "id";

export function controlFor(option: CommandOptionSummary): ControlKind {
	if (option.choices.length > 0) return "choice";
	if (option.type === "boolean") return "boolean";
	if (option.type === "integer" || option.type === "number") return "number";
	if (option.type === "user" || option.type === "channel" || option.type === "role") return "id";

	return "text";
}

export function optionsShown(command: CommandSummary | undefined, subcommand: string | null): CommandOptionSummary[] {
	if (command === undefined) return [];
	if (subcommand === null) return command.options;

	return command.subcommands.find((candidate) => candidate.name === subcommand)?.options ?? [];
}

export function needsSubcommand(command: CommandSummary | undefined): boolean {
	return command !== undefined && command.subcommands.length > 0;
}

/** An empty field is left out rather than sent as `""`, which a command would read as an answer. */
export function buildArgs(options: CommandOptionSummary[], raw: Record<string, string>): Record<string, ArgValue> {
	const args: Record<string, ArgValue> = {};

	for (const option of options) {
		const value = raw[option.name];
		if (value === undefined || value === "") continue;

		args[option.name] = coerce(option, value);
	}

	return args;
}

function coerce(option: CommandOptionSummary, value: string): ArgValue {
	if (controlFor(option) === "boolean") return value === "true";
	if (controlFor(option) === "number") {
		const parsed = Number(value);
		// Left as text when it is not a number, so the server's refusal names the option.
		return Number.isFinite(parsed) ? parsed : value;
	}

	return value;
}

export function missingRequired(options: CommandOptionSummary[], raw: Record<string, string>): string[] {
	return options.filter((option) => option.required && (raw[option.name] ?? "") === "").map((option) => option.name);
}

export function canRun(
	command: CommandSummary | undefined,
	subcommand: string | null,
	raw: Record<string, string>,
): boolean {
	if (command === undefined) return false;
	if (needsSubcommand(command) && subcommand === null) return false;

	return missingRequired(optionsShown(command, subcommand), raw).length === 0;
}

/** Discord sends an embed colour as an integer; CSS wants six hex digits. */
export function hexColour(colour: number | null): string | null {
	if (colour === null) return null;
	return `#${colour.toString(16).padStart(6, "0")}`;
}
