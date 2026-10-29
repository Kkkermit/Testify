import { render } from "@testing-library/react";
import { highlighted, languageOfFile } from "@/lib/highlight";

describe("languageOfFile", () => {
	it("picks the grammar from the name, and nothing for a file it does not know", () => {
		expect(
			["a.ts", "a.tsx", "a.json", "Dockerfile", ".env.example", "a.md", "a.yml", "a.png", "LICENSE"].map(
				languageOfFile,
			),
		).toEqual(["typescript", "typescript", "json", "dockerfile", "ini", "markdown", "yaml", null, null]);
	});
});

describe("highlighted", () => {
	/** Highlighting builds elements from a tree, so markup inside a file is drawn as the text it is. */
	it("draws markup in code as text, never as an element", () => {
		const { container } = render(<pre>{highlighted('const a = "<img src=x onerror=alert(1)>";', "typescript")}</pre>);

		expect(container.querySelector("img")).toBeNull();
		expect(container.textContent).toBe('const a = "<img src=x onerror=alert(1)>";');
		expect(container.querySelector(".hljs-keyword")?.textContent).toBe("const");
	});

	it("leaves code in a language it does not know as plain text", () => {
		expect(highlighted("plain", "cobol")).toBe("plain");
	});
});
