import { TABS, type Tab } from "@/features/levelling/levelling.types";
import { cn } from "@/lib/cn";

/**
 * The active underline is a child of the pressed tab rather than one bar positioned by measurement, so it needs
 * no layout reads and cannot drift when the labels reflow.
 */
export function Tabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }): React.JSX.Element {
	return (
		<div role="tablist" aria-label="Levelling settings" className="border-border mb-6 flex gap-1 border-b">
			{TABS.map(([key, label]) => (
				<button
					key={key}
					type="button"
					role="tab"
					aria-selected={active === key}
					onClick={() => {
						onSelect(key);
					}}
					className={cn(
						"relative -mb-px px-4 py-2 text-sm font-medium transition-colors duration-150",
						active === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{label}
					{active === key && (
						<span aria-hidden="true" className="bg-primary motion-fade absolute inset-x-0 -bottom-px h-0.5" />
					)}
				</button>
			))}
		</div>
	);
}
