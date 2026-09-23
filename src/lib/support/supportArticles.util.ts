import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PermissionsBitField } from "discord.js";
import { z } from "zod";
import { HIDDEN_CATEGORIES } from "@config/categories";
import { type Command } from "@core/command";
import { assetPath } from "@core/paths";
import { humanisePermission } from "@lib/format/format.util";
import { type SupportContext, type SupportEntry } from "@lib/support/support.types";
import { plainLine, SUPPORT_ARTICLE_ID, SUPPORT_LIMITS } from "@testify/shared";

/** The written help articles in `assets/support`, and a page for every command anybody may run. */

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

const frontmatter = z
	.object({
		id: z.string().max(SUPPORT_LIMITS.articleIdMax).regex(SUPPORT_ARTICLE_ID),
		title: plainLine(3, SUPPORT_LIMITS.titleMax),
		keywords: z.string().max(400).default(""),
		featured: z.enum(["true", "false"]).default("false"),
	})
	.strict();

export type ArticleResult = { ok: true; entry: SupportEntry } | { ok: false; file: string; reason: string };

export function parseArticle(file: string, source: string): ArticleResult {
	const match = FRONTMATTER.exec(source.replace(/\r\n/g, "\n"));
	if (match === null) return { ok: false, file, reason: "has no frontmatter" };

	const [, head = "", body = ""] = match;
	const fields = Object.fromEntries(
		head.split("\n").flatMap((line) => {
			const at = line.indexOf(":");
			return at === -1 ? [] : [[line.slice(0, at).trim(), line.slice(at + 1).trim()]];
		}),
	);

	const parsed = frontmatter.safeParse(fields);
	if (!parsed.success) {
		return { ok: false, file, reason: parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ") };
	}
	if (`${parsed.data.id}.md` !== file) return { ok: false, file, reason: "id does not match the file name" };

	const text = body.trim();
	if (text === "" || text.length > SUPPORT_LIMITS.bodyMax)
		return { ok: false, file, reason: "body is empty or too long" };

	return {
		ok: true,
		entry: {
			id: parsed.data.id,
			title: parsed.data.title,
			keywords: listOf(parsed.data.keywords),
			body: text,
			featured: parsed.data.featured === "true",
			kind: "article",
		},
	};
}

function listOf(value: string): string[] {
	return value
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part !== "");
}

export function loadArticles(directory = assetPath("support")): ArticleResult[] {
	return readdirSync(directory)
		.filter((file) => file.endsWith(".md"))
		.sort()
		.map((file) => parseArticle(file, readFileSync(join(directory, file), "utf8")));
}

export function commandEntries(commands: Iterable<Command>): SupportEntry[] {
	return [...commands]
		.filter((command) => command.ownerOnly !== true && !HIDDEN_CATEGORIES.includes(command.category))
		.sort((left, right) => left.name.localeCompare(right.name))
		.map((command) => {
			const subcommands = command.subcommands ?? [];
			const aliases = [...(command.aliases ?? []), ...subcommands.flatMap((sub) => sub.aliases ?? [])];
			const permissions =
				command.permissions === undefined || command.permissions.length === 0
					? []
					: new PermissionsBitField(command.permissions).toArray().map((name) => humanisePermission(name));

			const lines = [command.description, "", `Use it as \`/${command.name}\` or \`{prefix}${command.name}\`.`];
			if (subcommands.length > 0) {
				lines.push("", ...subcommands.map((sub) => `- \`/${command.name} ${sub.name}\`: ${sub.description}`));
			}
			if (aliases.length > 0) {
				lines.push("", `Prefix aliases: ${aliases.map((alias) => `\`{prefix}${alias}\``).join(", ")}.`);
			}
			if (permissions.length > 0) lines.push("", `Needs ${permissions.map((name) => `**${name}**`).join(", ")}.`);

			return {
				id: `command-${command.name}`,
				title: `The /${command.name} command`,
				keywords: [
					command.name,
					...command.name.split("-"),
					command.category,
					...aliases,
					...subcommands.map((sub) => sub.name),
				],
				body: lines.join("\n"),
				featured: false,
				kind: "command" as const,
			};
		});
}

export function fillPlaceholders(text: string, context: SupportContext): string {
	// Functions rather than strings, so a `$&` in a server's prefix is not read as a replacement pattern.
	return text
		.replaceAll("{bot}", () => context.bot)
		.replaceAll("{prefix}", () => context.prefix)
		.replaceAll("{repository}", () => context.repository);
}
