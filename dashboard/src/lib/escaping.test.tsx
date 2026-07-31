import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";

/**
 * Everything the dashboard shows about a guild — a server name, a welcome message, a role name — was typed by
 * somebody. React escapes it, and these pin that it stays escaped: the failure mode is one
 * `dangerouslySetInnerHTML` added later "just for this one bit of markdown".
 */
describe("rendering text a guild manager typed", () => {
	const payload = `<img src=x onerror="window.__owned = true">`;

	afterEach(() => {
		delete (window as { __owned?: boolean }).__owned;
	});

	it("shows a script payload as the text it is", () => {
		render(<p>{payload}</p>);

		expect(screen.getByText(payload)).toBeInTheDocument();
		expect(document.querySelector("img")).toBeNull();
		expect((window as { __owned?: boolean }).__owned).toBeUndefined();
	});

	it("does not execute an event handler smuggled in through an attribute", () => {
		render(
			<a href="/guilds" title={payload}>
				{"link"}
			</a>,
		);

		expect(document.querySelector("img")).toBeNull();
		expect((window as { __owned?: boolean }).__owned).toBeUndefined();
	});
});

function sourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) return sourceFiles(path);

		return /\.tsx?$/.test(entry) ? [path] : [];
	});
}

describe("the source tree", () => {
	// This file names the very things it bans, so it cannot be one of the files it reads.
	const files = sourceFiles(join(__dirname, "..")).filter((path) => !path.endsWith("escaping.test.tsx"));

	/** The lint rule bans these; this states the intent where a reader of the tests will see it. */
	it("contains no way of injecting HTML, anywhere", () => {
		for (const file of files) {
			const source = readFileSync(file, "utf8");

			expect({ file, has: source.includes("dangerouslySetInnerHTML") }).toEqual({ file, has: false });
			expect({ file, has: /\.innerHTML\s*=/.test(source) }).toEqual({ file, has: false });
			expect({ file, has: /\beval\(/.test(source) }).toEqual({ file, has: false });
		}
	});

	/** `javascript:` in an href is the one XSS React does not escape away on its own. */
	it("never builds a link target out of a value", () => {
		for (const file of files) {
			const source = readFileSync(file, "utf8");

			expect({ file, has: source.includes("javascript:") }).toEqual({ file, has: false });
		}
	});

	it("checks something", () => {
		expect(files.length).toBeGreaterThan(5);
	});
});
