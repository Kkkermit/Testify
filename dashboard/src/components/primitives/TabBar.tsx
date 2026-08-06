import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TabDefinition<Key extends string = string> {
	key: Key;
	label: string;
	icon: LucideIcon;
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
