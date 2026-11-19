import { readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { z } from "zod";
import { type Env } from "@config/env";
import {
	contactHref,
	DEFAULT_PREFIX,
	type InstanceOperator,
	plainLine,
	prefixText,
	repositoryCoordinates,
} from "@testify/shared";

/** What makes a copy of the bot somebody's own, read from `testify.config.json` beside `.env`. Nothing here is secret. */

export interface InstanceConfig {
	repository: string;
	supportServer: string | null;
	developer: string;
	operator: InstanceOperator | null;
	defaultPrefix: string;
	greetInviter: boolean;
}

export const INSTANCE_DEFAULTS: Readonly<InstanceConfig> = Object.freeze({
	repository: "https://github.com/Kkkermit/Testify",
	supportServer: "https://discord.gg/xcMVwAVjSD",
	developer: "Kkermit",
	operator: null,
	defaultPrefix: DEFAULT_PREFIX,
	greetInviter: true,
});

const httpsLink = z
	.string()
	.trim()
	.max(200, "is too long")
	.regex(/^https:\/\/[^\s<>"]+$/, "should be an https:// link");

const repository = httpsLink
	.refine(
		(value) => repositoryCoordinates(value) !== null,
		"should be a GitHub repository, like https://github.com/you/your-fork",
	)
	.transform((value) => {
		const { owner, repo } = repositoryCoordinates(value) ?? { owner: "", repo: "" };
		return `https://github.com/${owner}/${repo}`;
	});

const contact = z
	.string()
	.trim()
	.max(200, "is too long")
	.refine((value) => contactHref(value) !== null, "should be an email address or an https:// link");

export const instanceFileSchema = z.strictObject({
	$schema: z.string().optional(),
	repository: repository
		.describe(
			"Your copy's GitHub repository. The website's source browser shows it, and the bot's Source code buttons open it.",
		)
		.optional(),
	supportServer: z
		.union([z.null(), httpsLink])
		.describe("Where the bot's Support buttons lead, such as a Discord invite. null hides them.")
		.optional(),
	developer: plainLine(1, 64).describe("Who /bot info names as the developer.").optional(),
	operator: z
		.strictObject({
			name: plainLine(1, 100).describe("A person or an organisation."),
			contact: contact.describe("An email address or an https:// page."),
		})
		.nullable()
		.describe("Who runs this copy and how to reach them, shown on the privacy notice and the terms.")
		.optional(),
	defaultPrefix: prefixText
		.describe("The prefix a server starts with until it picks its own. Up to 8 characters, with no spaces.")
		.optional(),
	greetInviter: z
		.boolean()
		.describe("Sends whoever adds the bot to a server a direct message on how to get started.")
		.optional(),
});

export interface InstanceFile {
	name: string;
	path: string;
	exists: boolean;
}

/** Beside `.env`, for `npm run dev` and `npm start` alike; `TESTIFY_CONFIG` names another place, as Docker does. */
export function instanceFile(env: Pick<Env, "TESTIFY_CONFIG">): InstanceFile {
	const given = env.TESTIFY_CONFIG ?? "testify.config.json";
	const path = resolve(process.cwd(), given);

	// A folder is not the file, which is what Docker leaves where it was asked to mount one that did not exist.
	return { name: basename(given), path, exists: statSync(path, { throwIfNoEntry: false })?.isFile() ?? false };
}

interface InstanceProblem {
	key: string;
	message: string;
}

export class InstanceError extends Error {
	readonly file: InstanceFile;
	readonly problems: InstanceProblem[];

	constructor(file: InstanceFile, problems: InstanceProblem[]) {
		const lines = problems.map((problem) => `  ${problem.key} ${problem.message}`).join("\n");
		super(`Your ${file.name} file needs attention:\n\n${lines}`);
		this.name = "InstanceError";
		this.file = file;
		this.problems = problems;
	}
}

function problemsOf(error: z.ZodError): InstanceProblem[] {
	return error.issues.map((issue): InstanceProblem => {
		if (issue.code === "unrecognized_keys") {
			const where = issue.path.length === 0 ? "" : `${issue.path.join(".")}.`;
			return { key: issue.keys.map((key) => `${where}${key}`).join(", "), message: "is not a setting this bot has" };
		}
		return { key: issue.path.join("."), message: issue.message };
	});
}

/** Reads the file once; the result is fixed for the run, because nothing it decides may change under a live bot. */
export function readInstance(file: InstanceFile): InstanceConfig {
	if (!file.exists) return INSTANCE_DEFAULTS;

	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(file.path, "utf8"));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new InstanceError(file, [{ key: file.name, message: `is not valid JSON: ${reason}` }]);
	}

	const result = instanceFileSchema.safeParse(raw);
	if (!result.success) throw new InstanceError(file, problemsOf(result.error));

	const given = Object.fromEntries(
		Object.entries(result.data).filter(([key, value]) => key !== "$schema" && value !== undefined),
	);
	return Object.freeze({ ...INSTANCE_DEFAULTS, ...given });
}

let loaded: InstanceConfig | null = null;

export function loadInstance(env: Pick<Env, "TESTIFY_CONFIG">): InstanceConfig {
	loaded = readInstance(instanceFile(env));
	return loaded;
}

/** The defaults until start-up has read the file, which is what the tests and the scripts see. */
export function instanceConfig(): InstanceConfig {
	return loaded ?? INSTANCE_DEFAULTS;
}

/** Used by the tests, to run as a host whose file says something else. */
export function useInstance(config: InstanceConfig | null): void {
	loaded = config;
}

/** Used by the tests, so one case's config never reaches the next. */
export function resetInstance(): void {
	loaded = null;
}

/** What `testify.config.schema.json` holds, so an editor completes and checks the file as it is typed. */
export function instanceJsonSchema(): Record<string, unknown> {
	const { $schema, ...rest } = z.toJSONSchema(instanceFileSchema, { io: "input", unrepresentable: "any" });
	return {
		$schema,
		title: "testify.config.json",
		description: "What makes this copy of the bot your own. Every setting is optional; docs/customising.md lists them.",
		...rest,
	};
}
