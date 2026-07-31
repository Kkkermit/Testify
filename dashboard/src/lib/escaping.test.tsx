import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";

/**
 * Everything the dashboard shows about a guild — a welcome message, a role name, a level-up template — was
 * typed by somebody. React escapes it, and these pin that it stays escaped: the failure mode is one
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

	/** React refuses a `javascript:` href with a warning, but the assertion is what makes it a rule. */
	it("never builds an href out of raw user text", () => {
		const sources = readFileSync(join(__dirname, "../App.tsx"), "utf8");

		expect(sources).not.toMatch(/href=\{(?!["'/])/);
	});
});

describe("the source tree", () => {
	/** The lint rule bans these; this states the intent in a place a reader of the tests will see. */
	it("contains no way of injecting HTML", () => {
		for (const file of ["../App.tsx", "./api.ts"]) {
			const source = readFileSync(join(__dirname, file), "utf8");

			expect(source).not.toContain("dangerouslySetInnerHTML");
			expect(source).not.toContain("innerHTML");
			expect(source).not.toMatch(/\beval\(/);
		}
	});
});
