import { TABS, type Tab } from "@/features/levelling/levelling.types";
import { cn } from "@/lib/cn";

/**
 * The active underline is a child of the pressed tab rather than one bar positioned by measurement, so it needs
 * no layout reads and cannot drift when the labels reflow. The bar scrolls sideways on a phone instead of
 * wrapping, which would move the panel down the screen every time a tab changed.
 */
export function Tabs({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }): React.JSX.Element {
	return (
		<div role="tablist" aria-label="Levelling settings" className="border-border flex gap-1 overflow-x-auto border-b">
			{TABS.map(({ key, label, icon: Icon }) => (
				<button
					key={key}
					type="button"
					role="tab"
					aria-selected={active === key}
					onClick={() => {
						onSelect(key);
					}}
					className={cn(
						// The first tab is flush left, so its label sits on the same column as the page title above it.
						"relative -mb-px flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium first:pl-0",
						"transition-colors duration-150",
						active === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					<Icon size={15} aria-hidden="true" />
					{label}
					{active === key && (
						<span aria-hidden="true" className="bg-primary motion-fade absolute inset-x-0 -bottom-px h-0.5" />
					)}
				</button>
			))}
		</div>
	);
}
