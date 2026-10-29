import { type SourceFile } from "@testify/shared";
import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, SegmentedControl, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { Markdown, prepareDoc } from "@/features/docs/components/Markdown";
import { PAGES_BY_FILE, PAGES_BY_SECTION } from "@/features/docs/docs.pages";
import { SiteError } from "@/features/site/components/SiteError";
import { useSite } from "@/features/site/useSite";
import { formatBytes, lineCount } from "@/features/source/source.utils";
import { useSourceFile } from "@/features/source/useSource";
import { cn } from "@/lib/cn";
import { highlighted, languageOfFile } from "@/lib/highlight";

/** Past this a page highlighting every token stalls the tab, so the file is shown plain and still whole. */
const HIGHLIGHT_LIMIT = 150_000;

export function FileView({ path }: { path: string }): React.JSX.Element {
	const { t } = useTranslation();
	const file = useSourceFile(path);

	if (file.isError) {
		return (
			<SiteError
				title={t("source.fileFailedTitle")}
				body={t("source.fileFailedBody")}
				onRetry={() => {
					void file.refetch();
				}}
			/>
		);
	}
	if (file.data === undefined) return <Skeleton className="h-96 w-full" />;

	return <Shown file={file.data} />;
}

function Shown({ file }: { file: SourceFile }): React.JSX.Element {
	const { t } = useTranslation();
	const markdown = /\.md$/i.test(file.path);
	const [view, setView] = useState<"preview" | "code">("preview");

	return (
		<div className="flex flex-col gap-3">
			<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
				<span className="font-mono text-xs">
					{file.text === null
						? formatBytes(file.size)
						: t("source.fileFacts", { count: lineCount(file.text), size: formatBytes(file.size) })}
				</span>
				<span className="font-mono text-xs">{t("source.atRef", { ref: file.ref })}</span>
				{markdown && file.text !== null && (
					<SegmentedControl
						label={t("source.viewAs")}
						segments={[
							{ value: "preview", label: t("source.preview") },
							{ value: "code", label: t("source.code") },
						]}
						value={view}
						onChange={setView}
					/>
				)}
				<a href={file.githubUrl} rel="noreferrer" className={cn(INLINE_TARGET, "hover:text-foreground ml-auto gap-1")}>
					<ExternalLink size={13} aria-hidden="true" />
					{t("source.onGithub")}
				</a>
			</div>

			{file.text === null ? (
				<SiteError
					title={file.withheld === "too_large" ? t("source.tooLargeTitle") : t("source.binaryTitle")}
					body={file.withheld === "too_large" ? t("source.tooLargeBody") : t("source.binaryBody")}
				/>
			) : markdown && view === "preview" ? (
				<Preview path={file.path} text={file.text} />
			) : (
				<Code path={file.path} text={file.text} />
			)}
		</div>
	);
}

function Preview({ path, text }: { path: string; text: string }): React.JSX.Element {
	const site = useSite();
	const doc = useMemo(() => prepareDoc([{ file: path, markdown: text }]), [path, text]);

	return (
		<Card>
			<Markdown
				doc={doc}
				context={{
					repository: site.data?.repository ?? "",
					pagesByFile: PAGES_BY_FILE,
					pagesBySection: PAGES_BY_SECTION,
				}}
			/>
		</Card>
	);
}

/** The line numbers are a column of their own, so a copy of the code never carries them. */
function Code({ path, text }: { path: string; text: string }): React.JSX.Element {
	const { t } = useTranslation();
	const lines = lineCount(text);
	const body = useMemo(
		() => (text.length > HIGHLIGHT_LIMIT ? text : highlighted(text, languageOfFile(path))),
		[path, text],
	);

	return (
		// Focusable, so a keyboard can scroll a line wider than the screen.
		<div
			role="region"
			aria-label={t("source.codeOf", { path })}
			tabIndex={0}
			className="bg-card border-border surface-edge rounded-card focus-visible:outline-ring overflow-x-auto border focus-visible:outline-2"
		>
			<div className="flex min-w-max font-mono text-[0.8125rem] leading-6">
				<pre
					aria-hidden="true"
					className="text-muted-foreground border-border bg-card sticky left-0 border-r px-3 py-4 text-right select-none"
				>
					{Array.from({ length: Math.max(1, lines) }, (_, index) => index + 1).join("\n")}
				</pre>
				<pre className="code-tokens px-4 py-4">
					<code>{body}</code>
				</pre>
			</div>
		</div>
	);
}
