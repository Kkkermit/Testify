import { NavLink } from "react-router";
import { Tooltip } from "@/components/primitives";
import { type NavItem } from "@/config/navigation";
import { cn } from "@/lib/cn";

/** `sr-only` rather than `hidden` at the icon-only width: `display: none` would leave the link named nothing. */
export function SidebarLink({ item, expanded = false }: { item: NavItem; expanded?: boolean }): React.JSX.Element {
	const { to, label, icon: Icon, hint, exact = true } = item;

	return (
		<Tooltip label={hint ?? label} placement="right">
			<NavLink
				to={to}
				end={exact}
				className={({ isActive }) =>
					cn(
						"rounded-card relative flex items-center gap-3 px-2 py-2 text-sm transition-colors duration-150",
						isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
					)
				}
			>
				{({ isActive }) => (
					<>
						{/* Sits in the row's padding rather than in the flow, so the icon column does not shift. */}
						<span
							aria-hidden="true"
							className={cn(
								"bg-accent absolute top-1/2 left-0 w-0.5 -translate-y-1/2 rounded-full duration-200 ease-out",
								"transition-[height,opacity]",
								isActive ? "h-5 opacity-100" : "h-0 opacity-0",
							)}
						/>
						<span aria-hidden="true" className="flex w-[18px] shrink-0 justify-center">
							<Icon size={18} />
						</span>
						<span className={expanded ? "truncate" : "sr-only truncate lg:not-sr-only"}>{label}</span>
					</>
				)}
			</NavLink>
		</Tooltip>
	);
}
