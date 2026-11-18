import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import {
	INSTANCE_DEFAULTS,
	InstanceError,
	instanceFile,
	type InstanceFile,
	instanceJsonSchema,
	readInstance,
} from "@config/instance";

const ROOT = resolve(__dirname, "../..");

function fileWith(contents: string): InstanceFile {
	const path = join(mkdtempSync(join(tmpdir(), "testify-config-")), "testify.config.json");
	writeFileSync(path, contents, "utf8");
	return { name: "testify.config.json", path, exists: true };
}

const json = (value: unknown): InstanceFile => fileWith(JSON.stringify(value));

function problemsIn(file: InstanceFile): string[] {
	try {
		readInstance(file);
		return [];
	} catch (error) {
		return error instanceof InstanceError ? error.problems.map((problem) => `${problem.key} ${problem.message}`) : [];
	}
}

describe("the instance config file", () => {
	it("is optional, and a copy without one keeps the original's links and prefix", () => {
		expect(readInstance({ name: "testify.config.json", path: "/nowhere", exists: false })).toEqual(INSTANCE_DEFAULTS);
	});

	it("keeps the defaults for whatever it leaves out, and tidies a repository address", () => {
		const config = readInstance(
			json({
				$schema: "./testify.config.schema.json",
				repository: "https://github.com/someone/fork.git/",
				supportServer: null,
				operator: { name: "Sam's Servers", contact: "privacy@example.com" },
				defaultPrefix: "!",
			}),
		);

		expect(config).toEqual({
			...INSTANCE_DEFAULTS,
			repository: "https://github.com/someone/fork",
			supportServer: null,
			operator: { name: "Sam's Servers", contact: "privacy@example.com" },
			defaultPrefix: "!",
		});
	});

	/** A typo in a key would otherwise do nothing at all, silently, which is the worst way for a setting to fail. */
	it("names every problem at once, unknown keys included, so one start fixes them all", () => {
		const problems = problemsIn(
			json({
				supportserver: "https://discord.gg/x",
				repository: "https://gitlab.com/someone/fork",
				operator: { name: "Sam", contact: "javascript:alert(1)" },
				defaultPrefix: "t ?",
				greetInviter: "yes",
			}),
		);

		expect(problems).toEqual(
			expect.arrayContaining([
				"supportserver is not a setting this bot has",
				expect.stringMatching(/^repository should be a GitHub repository/),
				expect.stringMatching(/^operator\.contact should be an email address or an https/),
				"defaultPrefix cannot contain a space",
				expect.stringMatching(/^greetInviter /),
			]),
		);
		expect(problems).toHaveLength(5);
	});

	it("says a file that is not JSON is not JSON, rather than failing somewhere later", () => {
		expect(problemsIn(fileWith("{ repository: oops }"))).toEqual([expect.stringMatching(/is not valid JSON/)]);
	});

	/** Mounting a file that does not exist makes Docker create a folder there, which must read as no file. */
	it("reads a folder in the file's place as no file", () => {
		const folder = mkdtempSync(join(tmpdir(), "testify-config-"));
		mkdirSync(join(folder, "testify.config.json"));
		const cwd = jest.spyOn(process, "cwd").mockReturnValue(folder);

		expect(instanceFile({ NODE_ENV: "production", TESTIFY_CONFIG: undefined }).exists).toBe(false);
		cwd.mockRestore();
	});

	it("is read beside .env, as the development file under npm run dev, and wherever Docker points", () => {
		const names = [
			instanceFile({ NODE_ENV: "production", TESTIFY_CONFIG: undefined }).name,
			instanceFile({ NODE_ENV: "development", TESTIFY_CONFIG: undefined }).name,
			instanceFile({ NODE_ENV: "production", TESTIFY_CONFIG: "/app/instance/testify.config.json" }).path,
		];

		expect(names).toEqual([
			"testify.config.json",
			"testify.config.development.json",
			resolve("/app/instance/testify.config.json"),
		]);
	});

	it("ships an example that changes nothing when copied as it is", () => {
		const example = { name: "example", path: join(ROOT, "testify.config.example.json"), exists: true };

		expect(readInstance(example)).toEqual(INSTANCE_DEFAULTS);
	});

	/** The schema is what an editor checks the file against, so it has to follow the bot's own rules. */
	it("keeps testify.config.schema.json in step with the schema the bot reads with; npm run config:schema rewrites it", () => {
		expect(JSON.parse(readFileSync(join(ROOT, "testify.config.schema.json"), "utf8"))).toEqual(instanceJsonSchema());
	});
});

/** Every self-hosted copy linked its users to the original's support server, because the links were written in code. */
describe("what a host sets in the file", () => {
	function sources(directory: string): string[] {
		return readdirSync(directory).flatMap((name) => {
			const path = join(directory, name);
			if (statSync(path).isDirectory()) return sources(path);
			return /\.tsx?$/.test(name) ? [path] : [];
		});
	}

	const OWNED_BY_THE_CONFIG = join(ROOT, "src", "config", "instance.ts");

	it("is written nowhere else in the bot", () => {
		const written = sources(join(ROOT, "src"))
			.filter((path) => path !== OWNED_BY_THE_CONFIG)
			.filter((path) => {
				const text = readFileSync(path, "utf8");
				return /discord\.gg\/xcMVwAVjSD|github\.com\/Kkkermit\/Testify|\bDEFAULT_PREFIX\b/.test(text);
			})
			.map((path) => relative(ROOT, path));

		expect(written).toEqual([]);
	});
});
