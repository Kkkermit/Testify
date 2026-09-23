import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Generates `DASHBOARD_SESSION_SECRET`; `-- --write` puts it in .env, and `--dev` in .env.development. */

const KEY = "DASHBOARD_SESSION_SECRET";

export function generateSecret(): string {
	return randomBytes(32).toString("base64url");
}

/** Replaces the line if the key is already there, appends it if not, and leaves every other line alone. */
export function withSecret(contents: string, secret: string): string {
	const line = `${KEY}=${secret}`;
	const pattern = new RegExp(`^${KEY}=.*$`, "m");

	if (pattern.test(contents)) return contents.replace(pattern, line);

	const separator = contents === "" || contents.endsWith("\n") ? "" : "\n";
	return `${contents}${separator}${line}\n`;
}

function main(): void {
	const secret = generateSecret();

	if (!process.argv.includes("--write")) {
		console.log(`\n${KEY}=${secret}\n`);
		console.log("Copy that into your .env file, or re-run with --write to have it put there for you.");
		return;
	}

	const filename = process.argv.includes("--dev") ? ".env.development" : ".env";
	const target = resolve(process.cwd(), filename);

	if (!existsSync(target)) {
		console.error(`There is no ${filename} yet. Run \`npm run setup\` first, or use this without --write.`);
		process.exitCode = 1;
		return;
	}

	const before = readFileSync(target, "utf8");
	writeFileSync(target, withSecret(before, secret), "utf8");

	console.log(`Wrote a new ${KEY} to ${filename}.`);
	if (new RegExp(`^${KEY}=.+$`, "m").test(before)) {
		console.log("The old one is gone, so anyone signed in to the dashboard has been signed out.");
	}
}

if (require.main === module) main();
