import { type ManageableGuild } from "@testify/shared";
import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Avatar, Badge } from "@/components/primitives";
import { useCommands } from "@/features/commands/useCommands";
import { type SearchEntry, type SearchKind, searchEntries, searchFor } from "@/features/search/quickSearch.utils";
import { type TranslationKey } from "@/i18n";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<SearchKind, TranslationKey> = {
	screen: "search.kindScreen",
	command: "search.kindCommand",
	server: "search.kindServer",
};

/** A combobox in a dialog: the box keeps focus, and the arrows move a highlight through the results. */
export function QuickSearch({
	guild,
	guilds,
	isOwner,
	onClose,
}: {
	guild: { id: string; name: string } | undefined;
	guilds: readonly ManageableGuild[];
	isOwner: boolean;
	onClose: () => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const commands = useCommands();
	const listId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);

	const entries = useMemo(
		() => searchEntries({ t, guild, guilds, isOwner, commands: commands.data?.commands ?? [] }),
		[t, guild, guilds, isOwner, commands.data],
	);
	const results = useMemo(() => searchFor(entries, query), [entries, query]);
	const current = results[Math.min(active, results.length - 1)];

	useEffect(() => {
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		inputRef.current?.focus();

		// The page behind would otherwise scroll under a wheel meant for the results.
		const scrolling = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = scrolling;
			opener?.focus();
		};
	}, []);

	function go(entry: SearchEntry): void {
		onClose();
		void navigate(entry.to);
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			if (results.length === 0) return;
			const step = event.key === "ArrowDown" ? 1 : -1;
			setActive((was) => (Math.min(was, results.length - 1) + step + results.length) % results.length);
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (current !== undefined) go(current);
		} else if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			onClose();
		} else if (event.key === "Tab") {
			// Nothing else in the dialog takes focus, so Tab would only walk off the end of it.
			event.preventDefault();
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
			{/* Not a control: Escape already closes it, and a second way in the tab order is only noise. */}
			<div aria-hidden="true" onClick={onClose} className="bg-background/70 motion-fade absolute inset-0" />

			<div
				role="dialog"
				aria-modal="true"
				aria-label={t("search.title")}
				className="bg-popover border-border rounded-card motion-fade relative flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden border shadow-lg"
			>
				<div className="border-border focus-within:border-ring flex items-center gap-3 border-b px-4 transition-colors duration-150">
					<Search size={18} aria-hidden="true" className="text-muted-foreground shrink-0" />
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						aria-label={t("search.label")}
						aria-expanded={results.length > 0}
						aria-controls={listId}
						aria-autocomplete="list"
						aria-activedescendant={current === undefined ? undefined : `${listId}-${current.id}`}
						autoComplete="off"
						spellCheck={false}
						value={query}
						placeholder={t("search.placeholder")}
						onChange={(event) => {
							setQuery(event.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-3.5 text-[0.9375rem] outline-none"
					/>
					<kbd className="text-muted-foreground border-border rounded-chip shrink-0 border px-1.5 py-0.5 font-mono text-[0.6875rem]">
						Esc
					</kbd>
				</div>

				<ul id={listId} role="listbox" aria-label={t("search.results")} className="overflow-y-auto p-2">
					{results.map((entry, index) => (
						<li
							key={entry.id}
							id={`${listId}-${entry.id}`}
							role="option"
							aria-selected={entry === current}
							onMouseMove={() => {
								setActive(index);
							}}
							onClick={() => {
								go(entry);
							}}
							className={cn(
								"rounded-field flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm",
								entry === current ? "bg-muted text-foreground" : "text-muted-foreground",
							)}
						>
							<ResultIcon entry={entry} />
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="text-foreground truncate font-medium">{entry.label}</span>
								{entry.detail !== "" && <span className="truncate text-[0.8125rem]">{entry.detail}</span>}
							</span>
							<Badge>{t(KIND_LABEL[entry.kind])}</Badge>
						</li>
					))}
				</ul>

				{results.length === 0 && (
					<p className="text-muted-foreground px-4 pb-5 text-sm">{t("search.nothing", { query: query.trim() })}</p>
				)}

				<p role="status" className="sr-only">
					{t("search.count", { count: results.length })}
				</p>
			</div>
		</div>
	);
}

function ResultIcon({ entry }: { entry: SearchEntry }): React.JSX.Element {
	if (entry.guild !== undefined) {
		return <Avatar name={entry.guild.name} url={entry.guild.iconUrl} size={20} seed={entry.guild.id} />;
	}

	const Icon = entry.icon ?? Search;
	return <Icon size={18} aria-hidden="true" className="shrink-0" />;
}
