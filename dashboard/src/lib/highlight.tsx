import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import ini from "highlight.js/lib/languages/ini";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { type ReactNode } from "react";

/** Highlighting as React elements built from a tree, never as an HTML string, so nothing in a file can become markup. */

const lowlight = createLowlight({
	bash,
	css,
	diff,
	dockerfile,
	ini,
	javascript,
	json,
	markdown,
	typescript,
	xml,
	yaml,
});
const ALIASES: readonly [string, string[]][] = [
	["bash", ["sh", "shell", "console"]],
	["ini", ["dotenv", "env"]],
	["javascript", ["js", "cjs", "mjs", "jsx"]],
	["typescript", ["ts", "tsx", "mts", "cts"]],
	["markdown", ["md"]],
	["xml", ["html", "svg"]],
	["yaml", ["yml"]],
];
for (const [language, aliases] of ALIASES) lowlight.registerAlias(language, aliases);

const BY_EXTENSION: Record<string, string> = {
	ts: "typescript",
	tsx: "typescript",
	mts: "typescript",
	cts: "typescript",
	js: "javascript",
	jsx: "javascript",
	cjs: "javascript",
	mjs: "javascript",
	json: "json",
	md: "markdown",
	yml: "yaml",
	yaml: "yaml",
	css: "css",
	html: "xml",
	svg: "xml",
	xml: "xml",
	sh: "bash",
	diff: "diff",
};

/** The grammar for a file, by its name; null shows it plain rather than guessing. */
export function languageOfFile(path: string): string | null {
	const name = path.slice(path.lastIndexOf("/") + 1);
	if (name === "Dockerfile") return "dockerfile";
	if (name.startsWith(".env")) return "ini";
	if (name === ".prettierrc" || name === ".nsprc") return "json";

	const dot = name.lastIndexOf(".");
	return dot <= 0 ? null : (BY_EXTENSION[name.slice(dot + 1).toLowerCase()] ?? null);
}

export function knownLanguage(language: string | null | undefined): language is string {
	return language !== null && language !== undefined && language !== "" && lowlight.registered(language);
}

interface TreeNode {
	type: string;
	value?: string;
	properties?: { className?: unknown };
	children?: readonly TreeNode[];
}

function render(node: TreeNode, key: number): ReactNode {
	if (node.type === "text") return node.value ?? "";

	const children = (node.children ?? []).map(render);
	const classes = node.properties?.className;
	const className = Array.isArray(classes) ? classes.join(" ") : undefined;
	return (
		<span key={key} className={className}>
			{children}
		</span>
	);
}

/** The code as spans carrying highlight.js's class names, which `index.css` colours from the design tokens. */
export function highlighted(code: string, language: string | null | undefined): ReactNode {
	if (!knownLanguage(language)) return code;

	const tree = lowlight.highlight(language, code) as { children: readonly TreeNode[] };
	return tree.children.map(render);
}
