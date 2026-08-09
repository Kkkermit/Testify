import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TabDefinition<Key extends string = string> {
	key: Key;
	label: string;
	icon: LucideIcon;
}

/** Stable ids so a tab can point at its panel and the panel can borrow the tab's name. */
export function tabIds(label: string, key: string): { tabId: string; panelId: string } {
	const group = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
	return { tabId: `${group}-tab-${key}`, panelId: `${group}-panel-${key}` };
}

/** The rule is on a wrapper rather than the scroller: `overflow-x` also computes `overflow-y` to `auto`, which clips a marker hung past the edge. */
export function TabBar<Key extends string>({
	label,
	tabs,
	active,
	onSelect,
}: {
	label: string;
	tabs: readonly TabDefinition<Key>[];
	active: Key;
	onSelect: (tab: Key) => void;
}): React.JSX.Element {
	/** Arrow keys move between tabs and Tab leaves the set, which is what the tabs pattern asks for. */
	function onKeyDown(event: React.KeyboardEvent): void {
		const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
		const jump = { Home: 0, End: tabs.length - 1 }[event.key];
		if (step === undefined && jump === undefined) return;

		const at = tabs.findIndex((tab) => tab.key === active);
		const next = jump ?? (at + (step ?? 0) + tabs.length) % tabs.length;
		const chosen = tabs[next];
		if (chosen === undefined) return;

		event.preventDefault();
		onSelect(chosen.key);
		document.getElementById(tabIds(label, chosen.key).tabId)?.focus();
	}

	return (
		<div className="border-border border-b">
			<div
				role="tablist"
				aria-label={label}
				onKeyDown={onKeyDown}
				className="scrollbar-none flex gap-1 overflow-x-auto"
			>
				{tabs.map(({ key, label: text, icon: Icon }) => {
					const { tabId, panelId } = tabIds(label, key);

					return (
						<button
							key={key}
							id={tabId}
							type="button"
							role="tab"
							aria-selected={active === key}
							aria-controls={panelId}
							// One stop for the whole set, so Tab reaches the panel rather than the eighth tab.
							tabIndex={active === key ? 0 : -1}
							onClick={() => {
								onSelect(key);
							}}
							className={cn(
								// The first tab is flush left, so its label sits on the same column as the page title above it.
								"relative flex shrink-0 items-center gap-2 px-4 py-2 font-mono text-[0.75rem] tracking-[0.08em] uppercase first:pl-0",
								"transition-colors duration-150",
								active === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon size={15} aria-hidden="true" />
							{text}
							{active === key && (
								<span aria-hidden="true" className="bg-primary motion-fade absolute inset-x-0 bottom-0 h-0.5" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}

/** The other half of the pattern: a panel named by the tab that opens it. */
export function TabContent({
	label,
	active,
	className,
	children,
}: {
	label: string;
	active: string;
	className?: string;
	children: React.ReactNode;
}): React.JSX.Element {
	const { tabId, panelId } = tabIds(label, active);

	return (
		<div id={panelId} role="tabpanel" aria-labelledby={tabId} tabIndex={-1} className={className}>
			{children}
		</div>
	);
}
