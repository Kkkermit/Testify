import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TabDefinition<Key extends string = string> {
	key: Key;
	label: string;
	icon: LucideIcon;
}

/**
 * The active underline is a child of the pressed tab rather than one bar positioned by measurement, so it needs
 * no layout reads and cannot drift when the labels reflow. The bar scrolls sideways on a phone instead of
 * wrapping, which would move the panel down the screen every time a tab changed — and the scrollbar is hidden,
 * because it draws over the 2px underline directly beneath it.
 *
 * The rule below the tabs is on a wrapper rather than on the scroller: `overflow-x` also computes `overflow-y`
 * to `auto`, so a marker hung past the scroller's edge to reach the rule was clipped away instead of drawn.
 */
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
	return (
		<div className="border-border border-b">
			<div role="tablist" aria-label={label} className="scrollbar-none flex gap-1 overflow-x-auto">
				{tabs.map(({ key, label: text, icon: Icon }) => (
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
							"relative flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium first:pl-0",
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
				))}
			</div>
		</div>
	);
}
