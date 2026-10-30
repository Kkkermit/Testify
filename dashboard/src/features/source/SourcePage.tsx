import { ChevronRight } from "lucide-react";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { PAGE_TITLE, Skeleton } from "@/components/primitives";
import { INLINE_TARGET } from "@/components/primitives/targetStyles";
import { SiteError } from "@/features/site/components/SiteError";
import { TrailBack } from "@/features/site/components/TrailBack";
import { FileTree } from "@/features/source/components/FileTree";
import { FileView } from "@/features/source/components/FileView";
import { FolderView } from "@/features/source/components/FolderView";
import { Standing } from "@/features/source/components/Standing";
import { Traffic } from "@/features/source/components/Traffic";
import { indexTree, nameOf, sourceRoute } from "@/features/source/source.utils";
import { useTree } from "@/features/source/useSource";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/** `/source-code` is the repository and its numbers; anything under it is a folder or a file of the running release. */
export function SourcePage(): React.JSX.Element {
	const { t } = useTranslation();
	const path = (useParams()["*"] ?? "").replace(/\/+$/, "");
	usePageTitle(path === "" ? t("source.title") : nameOf(path), path === "" ? undefined : t("source.title"));
	const tree = useTree();
	const index = useMemo(() => (tree.data === undefined ? null : indexTree(tree.data.entries)), [tree.data]);
	const entry = index?.byPath.get(path);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6">
			<TrailBack />
			{path === "" ? <Standing /> : <Breadcrumbs path={path} />}

			{tree.isError ? (
				<TreeFailure error={tree.error} retry={() => void tree.refetch()} />
			) : index === null || tree.data === undefined ? (
				<Skeleton className="h-96 w-full" />
			) : (
				// The file comes first, so a phone opens on it rather than below every folder; the grid puts the tree left.
				<div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
					<div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
						{tree.data.truncated && <p className="text-warning text-sm">{t("source.truncated")}</p>}
						{path === "" || entry?.type === "folder" ? (
							<FolderView index={index} folder={path} />
						) : entry === undefined ? (
							<SiteError title={t("source.missingTitle")} body={t("source.missingBody", { ref: tree.data.ref })} />
						) : (
							<FileView path={path} />
						)}
					</div>
					<FileTree
						index={index}
						entries={tree.data.entries}
						current={path}
						className="lg:col-start-1 lg:row-start-1"
					/>
				</div>
			)}

			{path === "" && <Traffic />}
		</div>
	);
}

function Breadcrumbs({ path }: { path: string }): React.JSX.Element {
	const { t } = useTranslation();
	const parts = path.split("/");

	return (
		<header className="flex flex-col gap-2">
			<nav aria-label={t("source.breadcrumbs")}>
				<ol className="text-muted-foreground flex flex-wrap items-center gap-1 font-mono text-xs">
					<li>
						<Link to="/source-code" className={cn(INLINE_TARGET, "hover:text-foreground")}>
							{t("source.root")}
						</Link>
					</li>
					{parts.slice(0, -1).map((part, index) => (
						<Fragment key={index}>
							<li aria-hidden="true">
								<ChevronRight size={12} />
							</li>
							<li>
								<Link
									to={sourceRoute(parts.slice(0, index + 1).join("/"))}
									className={cn(INLINE_TARGET, "hover:text-foreground")}
								>
									{part}
								</Link>
							</li>
						</Fragment>
					))}
				</ol>
			</nav>
			<h1 className={cn(PAGE_TITLE, "font-mono break-all")}>{nameOf(path)}</h1>
		</header>
	);
}

function TreeFailure({ error, retry }: { error: unknown; retry: () => void }): React.JSX.Element {
	const { t } = useTranslation();

	if (error instanceof ApiError && error.code === "private_repository") {
		return <SiteError title={t("source.privateTitle")} body={t("source.privateBody")} />;
	}
	if (error instanceof ApiError && error.code === "no_repository") {
		return <SiteError title={t("source.noRepositoryTitle")} body={t("source.noRepositoryBody")} />;
	}
	return <SiteError title={t("source.failedTitle")} body={t("source.failedBody")} onRetry={retry} />;
}
