import { FileText, Folder } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, Skeleton } from "@/components/primitives";
import { Markdown, prepareDoc } from "@/features/docs/components/Markdown";
import { PAGES_BY_FILE, PAGES_BY_SECTION } from "@/features/docs/docs.pages";
import { useSite } from "@/features/site/useSite";
import { formatBytes, nameOf, readmeIn, sourceRoute, type TreeIndex } from "@/features/source/source.utils";
import { useSourceFile } from "@/features/source/useSource";
import { cn } from "@/lib/cn";

/** A folder's contents, folders first, and its README under them as GitHub would show it. */
export function FolderView({ index, folder }: { index: TreeIndex; folder: string }): React.JSX.Element {
	const { t } = useTranslation();
	const readme = readmeIn(index, folder);

	return (
		<div className="flex flex-col gap-4">
			<Card padding="none">
				<ul className="divide-border flex flex-col divide-y">
					{(index.children.get(folder) ?? []).map((entry) => (
						<li key={entry.path}>
							<Link
								to={sourceRoute(entry.path)}
								className={cn(
									"hover:bg-muted/60 flex min-h-11 items-center gap-3 px-6 py-2 text-sm transition-colors duration-150",
									"focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
								)}
							>
								{entry.type === "folder" ? (
									<Folder size={15} aria-hidden="true" className="text-accent shrink-0" />
								) : (
									<FileText size={15} aria-hidden="true" className="text-muted-foreground shrink-0" />
								)}
								<span className="min-w-0 flex-1 truncate">{nameOf(entry.path)}</span>
								{entry.size !== null && (
									<span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
										{formatBytes(entry.size)}
									</span>
								)}
							</Link>
						</li>
					))}
				</ul>
			</Card>

			{readme !== undefined && (
				<section aria-label={t("source.readme")} className="flex flex-col gap-3">
					<Readme path={readme.path} />
				</section>
			)}
		</div>
	);
}

function Readme({ path }: { path: string }): React.JSX.Element | null {
	const file = useSourceFile(path);
	const site = useSite();
	const doc = useMemo(() => {
		const text = file.data?.text;
		return text === null || text === undefined ? null : prepareDoc([{ file: path, markdown: text }]);
	}, [file.data, path]);

	// The listing above still links to it, so a README that will not load is simply not shown.
	if (file.isError) return null;
	if (doc === null) return <Skeleton className="h-40 w-full" />;

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
