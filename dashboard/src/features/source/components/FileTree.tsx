import { type SourceEntry } from "@testify/shared";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { SearchField } from "@/components/form/SearchField";
import { ancestorsOf, matchingFiles, nameOf, sourceRoute, type TreeIndex } from "@/features/source/source.utils";
import { cn } from "@/lib/cn";

const ROW = cn(
	"rounded-chip flex min-h-7 min-w-0 flex-1 items-center gap-2 pr-2 text-sm transition-colors duration-150",
	"focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
);

/** The repository as folders that open in place; a filter swaps the tree for every file whose path matches. */
export function FileTree({
	index,
	entries,
	current,
	className,
}: {
	index: TreeIndex;
	entries: readonly SourceEntry[];
	current: string;
	className?: string | undefined;
}): React.JSX.Element {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([...ancestorsOf(current), current]));

	// A link from elsewhere lands deep in the tree, which opens to show where it is.
	useEffect(() => {
		setOpen((was) => new Set([...was, ...ancestorsOf(current), current]));
	}, [current]);

	const toggle = (folder: string): void => {
		setOpen((was) => {
			const next = new Set(was);
			if (next.has(folder)) next.delete(folder);
			else next.add(folder);
			return next;
		});
	};

	const matches = matchingFiles(entries, query);

	return (
		<nav
			aria-label={t("source.files")}
			className={cn(
				"bg-card border-border surface-edge rounded-card flex flex-col gap-2 border p-2",
				"lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)]",
				className,
			)}
		>
			<SearchField
				label={t("source.filter")}
				placeholder={t("source.filterPlaceholder")}
				value={query}
				onChange={setQuery}
			/>

			<div className="min-h-0 overflow-y-auto overscroll-contain">
				{query.trim() !== "" ? (
					matches.length === 0 ? (
						<p className="text-muted-foreground px-2 py-2 text-sm">{t("source.noMatch")}</p>
					) : (
						<ul className="flex flex-col">
							{matches.map((entry) => (
								<li key={entry.path}>
									<Link
										to={sourceRoute(entry.path)}
										className={cn(ROW, "text-muted-foreground hover:text-foreground hover:bg-muted px-2")}
									>
										<FileText size={14} aria-hidden="true" className="shrink-0" />
										<span className="truncate font-mono text-xs">{entry.path}</span>
									</Link>
								</li>
							))}
						</ul>
					)
				) : (
					<Branch index={index} folder="" depth={0} open={open} current={current} toggle={toggle} />
				)}
			</div>
		</nav>
	);
}

function Branch({
	index,
	folder,
	depth,
	open,
	current,
	toggle,
}: {
	index: TreeIndex;
	folder: string;
	depth: number;
	open: ReadonlySet<string>;
	current: string;
	toggle: (folder: string) => void;
}): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<ul className="flex flex-col">
			{(index.children.get(folder) ?? []).map((entry) => {
				const name = nameOf(entry.path);
				const isOpen = open.has(entry.path);
				const here = entry.path === current;
				const indent = { paddingLeft: `${String(depth * 0.75)}rem` };

				return (
					<li key={entry.path}>
						<div className="flex items-center" style={indent}>
							{entry.type === "folder" ? (
								<button
									type="button"
									aria-expanded={isOpen}
									aria-label={t(isOpen ? "source.closeFolder" : "source.openFolder", { name })}
									onClick={() => {
										toggle(entry.path);
									}}
									className="text-muted-foreground hover:text-foreground rounded-chip flex size-7 shrink-0 items-center justify-center"
								>
									<ChevronRight
										size={14}
										aria-hidden="true"
										className={cn("transition-transform duration-150", isOpen && "rotate-90")}
									/>
								</button>
							) : (
								<span className="size-7 shrink-0" />
							)}
							<Link
								to={sourceRoute(entry.path)}
								aria-current={here ? "page" : undefined}
								className={cn(
									ROW,
									here
										? "bg-muted text-foreground font-medium"
										: "text-muted-foreground hover:text-foreground hover:bg-muted",
								)}
							>
								{entry.type === "folder" ? (
									isOpen ? (
										<FolderOpen size={14} aria-hidden="true" className="text-accent shrink-0" />
									) : (
										<Folder size={14} aria-hidden="true" className="text-accent shrink-0" />
									)
								) : (
									<FileText size={14} aria-hidden="true" className="shrink-0" />
								)}
								<span className="truncate">{name}</span>
							</Link>
						</div>
						{entry.type === "folder" && isOpen && (
							<Branch
								index={index}
								folder={entry.path}
								depth={depth + 1}
								open={open}
								current={current}
								toggle={toggle}
							/>
						)}
					</li>
				);
			})}
		</ul>
	);
}
