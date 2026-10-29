import { headingName } from "@/features/docs/markdown.utils";
import { type TranslationKey } from "@/i18n";

/** The docs as data: every page names the file it is read from, so it cannot describe a bot that is no longer there. */

export const DOC_FILES = [
	"README.md",
	"AGENTS.md",
	"docs/hosting.md",
	"docs/commands.md",
	"docs/contributing.md",
	"docs/security.md",
	"docs/dashboard/guide.md",
	".env.example",
] as const;

export type DocFile = (typeof DOC_FILES)[number];

/** Each file is its own chunk, so a page downloads only what it shows. */
export const LOADERS: Record<DocFile, () => Promise<string>> = {
	"README.md": async () => (await import("@repo/README.md?raw")).default,
	"AGENTS.md": async () => (await import("@repo/AGENTS.md?raw")).default,
	"docs/hosting.md": async () => (await import("@repo/docs/hosting.md?raw")).default,
	"docs/commands.md": async () => (await import("@repo/docs/commands.md?raw")).default,
	"docs/contributing.md": async () => (await import("@repo/docs/contributing.md?raw")).default,
	"docs/security.md": async () => (await import("@repo/docs/security.md?raw")).default,
	"docs/dashboard/guide.md": async () => (await import("@repo/docs/dashboard/guide.md?raw")).default,
	".env.example": async () => (await import("@repo/.env.example?raw")).default,
};

export const DOC_GROUPS = ["run", "use", "change"] as const;
export type DocGroup = (typeof DOC_GROUPS)[number];

export const GROUP_LABELS: Record<DocGroup, TranslationKey> = {
	run: "docs.groups.run",
	use: "docs.groups.use",
	change: "docs.groups.change",
};

interface PageBase {
	slug: string;
	group: DocGroup;
	titleKey: TranslationKey;
	summaryKey: TranslationKey;
}

/** A page of Markdown: whole files, or named sections of one, shown in the order listed. */
export interface MarkdownPage extends PageBase {
	kind: "markdown";
	sources: readonly { file: DocFile; sections?: readonly string[] }[];
}

/** Every environment variable, read out of `.env.example`. */
export interface ConfigurationPage extends PageBase {
	kind: "configuration";
}

/** The help articles `/ask` answers with, filled in by the bot for its own prefix and limits. */
export interface GuidesPage extends PageBase {
	kind: "guides";
}

export type DocPage = MarkdownPage | ConfigurationPage | GuidesPage;

export const DOC_PAGES: readonly DocPage[] = [
	{
		slug: "requirements",
		group: "run",
		kind: "markdown",
		titleKey: "docs.pages.requirements",
		summaryKey: "docs.pages.requirementsSummary",
		sources: [{ file: "README.md", sections: ["Compatibility"] }],
	},
	{
		slug: "quick-start",
		group: "run",
		kind: "markdown",
		titleKey: "docs.pages.quickStart",
		summaryKey: "docs.pages.quickStartSummary",
		sources: [{ file: "README.md", sections: ["Quick start"] }],
	},
	{
		slug: "setup",
		group: "run",
		kind: "markdown",
		titleKey: "docs.pages.setup",
		summaryKey: "docs.pages.setupSummary",
		sources: [{ file: "README.md", sections: ["Full setup guide"] }],
	},
	{
		slug: "configuration",
		group: "run",
		kind: "configuration",
		titleKey: "docs.pages.configuration",
		summaryKey: "docs.pages.configurationSummary",
	},
	{
		slug: "docker",
		group: "run",
		kind: "markdown",
		titleKey: "docs.pages.docker",
		summaryKey: "docs.pages.dockerSummary",
		sources: [{ file: "docs/hosting.md" }],
	},
	{
		slug: "dashboard",
		group: "run",
		kind: "markdown",
		titleKey: "docs.pages.dashboard",
		summaryKey: "docs.pages.dashboardSummary",
		sources: [{ file: "README.md", sections: ["The website", "The web dashboard"] }],
	},
	{
		slug: "scripts",
		group: "run",
		kind: "markdown",
		titleKey: "docs.pages.scripts",
		summaryKey: "docs.pages.scriptsSummary",
		sources: [{ file: "README.md", sections: ["Scripts"] }],
	},
	{
		slug: "commands",
		group: "use",
		kind: "markdown",
		titleKey: "docs.pages.commands",
		summaryKey: "docs.pages.commandsSummary",
		sources: [{ file: "docs/commands.md" }],
	},
	{
		slug: "slash-and-prefix",
		group: "use",
		kind: "markdown",
		titleKey: "docs.pages.slashAndPrefix",
		summaryKey: "docs.pages.slashAndPrefixSummary",
		sources: [{ file: "README.md", sections: ["Slash and prefix", "Command categories"] }],
	},
	{
		slug: "guides",
		group: "use",
		kind: "guides",
		titleKey: "docs.pages.guides",
		summaryKey: "docs.pages.guidesSummary",
	},
	{
		slug: "faq",
		group: "use",
		kind: "markdown",
		titleKey: "docs.pages.faq",
		summaryKey: "docs.pages.faqSummary",
		sources: [{ file: "README.md", sections: ["FAQ"] }],
	},
	{
		slug: "troubleshooting",
		group: "use",
		kind: "markdown",
		titleKey: "docs.pages.troubleshooting",
		summaryKey: "docs.pages.troubleshootingSummary",
		sources: [{ file: "README.md", sections: ["Troubleshooting"] }],
	},
	{
		slug: "adding-a-command",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.addingACommand",
		summaryKey: "docs.pages.addingACommandSummary",
		sources: [
			{ file: "README.md", sections: ["Adding your own command"] },
			{
				file: "AGENTS.md",
				sections: ["Adding a command", "Adding an event", "Adding an interactive panel", "Components V2"],
			},
		],
	},
	{
		slug: "codebase",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.codebase",
		summaryKey: "docs.pages.codebaseSummary",
		sources: [
			{
				file: "AGENTS.md",
				sections: [
					"Project structure",
					"How a command runs, end to end",
					"Naming conventions",
					"Import aliases and barrels",
				],
			},
		],
	},
	{
		slug: "testing",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.testing",
		summaryKey: "docs.pages.testingSummary",
		sources: [{ file: "AGENTS.md", sections: ["Running, testing, verifying", "Testing", "Lint, format, style"] }],
	},
	{
		slug: "ci",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.ci",
		summaryKey: "docs.pages.ciSummary",
		sources: [{ file: "AGENTS.md", sections: ["Committing and branching", "CI"] }],
	},
	{
		slug: "contributing",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.contributing",
		summaryKey: "docs.pages.contributingSummary",
		sources: [{ file: "docs/contributing.md" }],
	},
	{
		slug: "dashboard-development",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.dashboardDevelopment",
		summaryKey: "docs.pages.dashboardDevelopmentSummary",
		sources: [{ file: "docs/dashboard/guide.md" }],
	},
	{
		slug: "security",
		group: "change",
		kind: "markdown",
		titleKey: "docs.pages.security",
		summaryKey: "docs.pages.securitySummary",
		sources: [{ file: "docs/security.md" }],
	},
];

export function docPage(slug: string | undefined): DocPage | undefined {
	return DOC_PAGES.find((page) => page.slug === slug);
}

/** The page that shows a whole file, for a link written to that file. */
export const PAGES_BY_FILE: Readonly<Record<string, string>> = Object.fromEntries(
	DOC_PAGES.flatMap((page) =>
		page.kind === "markdown"
			? page.sources.filter((source) => source.sections === undefined).map((source) => [source.file, page.slug])
			: [],
	),
);

/** The page that shows one section, for a link written to that section's anchor. */
export const PAGES_BY_SECTION: Readonly<Record<string, string>> = Object.fromEntries(
	DOC_PAGES.flatMap((page) =>
		page.kind === "markdown"
			? page.sources.flatMap((source) =>
					(source.sections ?? []).map((name) => [`${source.file}#${headingName(name)}`, page.slug]),
				)
			: [],
	),
);
