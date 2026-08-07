import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useLocation } from "react-router";
import { SidebarLink } from "@/app/layout/SidebarLink";
import { type NavSection, sectionHolds } from "@/config/navigation";
import { cn } from "@/lib/cn";

/** The icon-only rail has no room for a toggle, so below `lg` the button is absent and the items stay flat. */
export function SidebarSection({
	section,
	expanded = false,
}: {
	section: NavSection;
	expanded?: boolean;
}): React.JSX.Element {
	const { pathname } = useLocation();
	const listId = useId();
	const holdsCurrent = sectionHolds(section, pathname);
	const [open, setOpen] = useState(holdsCurrent);

	useEffect(() => {
		if (holdsCurrent) setOpen(true);
	}, [holdsCurrent]);

	const Icon = section.icon;
	const collapsible = expanded || undefined;

	return (
		<li>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={listId}
				onClick={() => {
					setOpen((was) => !was);
				}}
				className={cn(
					"rounded-card text-muted-foreground hover:text-foreground hover:bg-muted/60 flex w-full items-center gap-3 px-2 py-2 text-sm transition-colors duration-150",
					expanded ? "flex" : "hidden lg:flex",
				)}
			>
				<span aria-hidden="true" className="flex w-[18px] shrink-0 justify-center">
					<Icon size={18} />
				</span>
				<span className="flex-1 truncate text-left">{section.label}</span>
				<ChevronDown
					size={14}
					aria-hidden="true"
					className={cn("shrink-0 transition-transform duration-200 ease-out", open ? "rotate-180" : "")}
				/>
			</button>

			<ul
				id={listId}
				className={cn(
					"flex flex-col gap-1",
					// Indented only where the label column exists; the rail keeps every icon on one line.
					expanded
						? "ml-[9px] border-l border-border pl-[9px]"
						: "lg:ml-[9px] lg:border-l lg:border-border lg:pl-[9px]",
					open ? "" : collapsible === true ? "hidden" : "lg:hidden",
				)}
			>
				{section.items.map((item) => (
					<li key={item.to}>
						<SidebarLink item={item} expanded={expanded} />
					</li>
				))}
			</ul>
		</li>
	);
}
