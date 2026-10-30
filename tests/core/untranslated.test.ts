import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

/** Words written into a dashboard component never change language, so everything a reader sees or hears comes from `t`. */

const SRC = resolve(__dirname, "../../dashboard/src");

const READ_ALOUD = new Set([
	"aria-label",
	"aria-description",
	"title",
	"placeholder",
	"alt",
	"label",
	"body",
	"description",
	"hint",
	"heading",
	"eyebrow",
	"subtitle",
	"empty",
	"message",
	"caption",
]);
const WORD = /[A-Za-z]{2,}/;
/** Two words apart by a space or a comma, or one capitalised word; a slug, a class or a path has neither. */
const PROSE = /[A-Za-z]{2,}[\s,;:]+[A-Za-z]{2,}|^\s*[A-Z][a-z]+\s*$/;
const SHOWN_PROPERTIES = new Set([
	"label",
	"title",
	"sub",
	"hint",
	"description",
	"body",
	"heading",
	"value",
	"text",
	"detail",
]);

/** Discord's own badge and a keycap read the same in every language. */
const ALLOWED = new Set([
	"features/welcome/components/GreetingPreview.tsx: BOT",
	"features/search/QuickSearch.tsx: Esc",
]);

/** The literal text in a string or a template, without what is substituted into it. */
function literalOf(node: ts.Node): string | null {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
	if (ts.isTemplateExpression(node))
		return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
	return null;
}

/** A word beside a substituted value is a sentence being built; a bare word on its own is more often a key. */
function isCopy(node: ts.Node): boolean {
	const text = literalOf(node) ?? "";
	return ts.isTemplateExpression(node) ? WORD.test(text) : PROSE.test(text);
}

/** Strings an expression can put on the page itself: through a ternary or `&&`, never through a call such as `t(…)`. */
function shownStrings(node: ts.Node): ts.Node[] {
	if (literalOf(node) !== null) return [node];
	if (ts.isParenthesizedExpression(node)) return shownStrings(node.expression);
	if (ts.isConditionalExpression(node)) return [...shownStrings(node.whenTrue), ...shownStrings(node.whenFalse)];
	if (ts.isBinaryExpression(node)) return [...shownStrings(node.left), ...shownStrings(node.right)];
	return [];
}

function untranslated(path: string): string[] {
	const name = relative(SRC, path).replaceAll("\\", "/");
	const kind = path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
	const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, kind);
	const found: string[] = [];

	const report = (node: ts.Node, text: string): void => {
		const words = text.replace(/\s+/g, " ").trim();
		if (!WORD.test(words) || ALLOWED.has(`${name}: ${words}`)) return;
		const { line } = file.getLineAndCharacterOfPosition(node.getStart());
		found.push(`${name}:${String(line + 1)}: ${words.slice(0, 70)}`);
	};

	const visit = (node: ts.Node): void => {
		if (ts.isJsxText(node)) report(node, node.text);
		else if (ts.isJsxAttribute(node) && node.initializer !== undefined) {
			const name = node.name.getText();
			const value = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
			for (const shown of value === undefined ? [] : shownStrings(value)) {
				// A figure's `value` is drawn, an input's is not, so only a built sentence counts there.
				if (READ_ALOUD.has(name) || (name === "value" && isCopy(shown))) report(shown, literalOf(shown) ?? "");
			}
		} else if (
			ts.isPropertyAssignment(node) &&
			(ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
			SHOWN_PROPERTIES.has(node.name.text)
		) {
			// A row handed to a list or a figure is drawn just like a prop, so its label and value are copy too.
			for (const shown of shownStrings(node.initializer)) {
				if (isCopy(shown)) report(shown, literalOf(shown) ?? "");
			}
		} else if (ts.isJsxExpression(node) && !ts.isJsxAttribute(node.parent) && node.expression !== undefined) {
			// Two words or a capitalised one, so a `"file"` compared in a filter is not mistaken for copy and `"On"` is not missed.
			for (const shown of shownStrings(node.expression)) {
				if (isCopy(shown)) report(shown, literalOf(shown) ?? "");
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(file);
	return found;
}

/** Every module but the tests, the dictionaries themselves and shadcn's reserved folder. */
function modules(directory: string, found: string[] = []): string[] {
	for (const entry of readdirSync(directory)) {
		const path = join(directory, entry);
		if (statSync(path).isDirectory()) {
			if (!["test", "i18n", "ui"].includes(entry)) modules(path, found);
		} else if (/\.tsx?$/.test(entry) && !/\.(test|d)\.tsx?$/.test(entry)) found.push(path);
	}
	return found;
}

const components = modules(SRC);

describe("untranslated copy", () => {
	it("has components to read, so a broken walk cannot pass vacuously", () => {
		expect(components.length).toBeGreaterThan(100);
	});

	it("writes no words into a component that do not come from the dictionaries", () => {
		expect(components.flatMap(untranslated)).toEqual([]);
	});
});
